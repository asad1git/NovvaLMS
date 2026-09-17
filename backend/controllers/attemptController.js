const asyncHandler = require("express-async-handler");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const QuizAttempt = require("../models/QuizAttempt");
const Answer = require("../models/Answer");
const { recomputeAttemptScore } = require("../utils/scoring");
const { getAIProvider } = require("../services/ai");

async function loadOwnInProgressAttempt(req, res) {
  const attempt = await QuizAttempt.findById(req.params.id);
  if (!attempt) {
    res.status(404);
    throw new Error("Attempt not found");
  }
  if (String(attempt.student) !== String(req.user._id)) {
    res.status(403);
    throw new Error("This is not your attempt");
  }
  if (attempt.submittedAt) {
    res.status(400);
    throw new Error("This quiz has already been submitted");
  }
  return attempt;
}

/**
 * US-08 — PUT /api/attempts/:id/answers (Student, own attempt only)
 * The frontend calls this every 30s (plus once more right before submit)
 * rather than on every click — this is the "30s auto-save" from the story.
 * Branches on question type: an MCQ answer is a selectedOptionIndex, a
 * subjective answer is free-text.
 */
const autosaveAnswer = asyncHandler(async (req, res) => {
  const attempt = await loadOwnInProgressAttempt(req, res);

  const quiz = await Quiz.findById(attempt.quiz);
  const deadline = new Date(attempt.startedAt.getTime() + quiz.durationMinutes * 60 * 1000);
  if (new Date() > deadline) {
    res.status(400);
    throw new Error("Time limit exceeded");
  }

  const { questionId, selectedOptionIndex, textAnswer } = req.body;
  const question = await Question.findOne({ _id: questionId, quiz: attempt.quiz });
  if (!question) {
    res.status(400);
    throw new Error("Question does not belong to this quiz");
  }

  const update = question.type === "subjective" ? { textAnswer } : { selectedOptionIndex };

  const answer = await Answer.findOneAndUpdate(
    { attempt: attempt._id, question: question._id },
    update,
    { upsert: true, new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: answer });
});

/**
 * Drafts an AI grade for one subjective answer and saves it as
 * aiDraftScore/aiDraftJustification — never touches score/feedback/
 * gradeStatus, so this can safely run after the HTTP response has already
 * been sent. Failures are swallowed: the Teacher just grades manually in
 * Grade Approvals for that answer, exactly as before this feature existed.
 * `question` must have been fetched with `.select("+modelAnswer")` for the
 * rubric to actually be usable here — modelAnswer is select:false, so a
 * plain query would silently give `undefined` regardless of the toggle.
 */
async function draftGradeInBackground(attemptId, question) {
  try {
    const answer = await Answer.findOne({ attempt: attemptId, question: question._id });
    if (!answer) return;

    const provider = getAIProvider();
    const draft = await provider.gradeSubjective({
      question: question.text,
      maxScore: question.maxScore,
      answer: answer.textAnswer,
      modelAnswer: question.useRubricForGrading && question.modelAnswer ? question.modelAnswer : undefined,
    });

    answer.aiDraftScore = draft.score;
    answer.aiDraftJustification = draft.justification;
    await answer.save();
  } catch (err) {
    // Intentionally swallowed — see doc comment above.
  }
}

/**
 * US-08 / HITL — POST /api/attempts/:id/submit (Student, own attempt only)
 * MCQ answers are graded immediately. Subjective answers can't be — they're
 * marked "pending" here and picked up in `recomputeAttemptScore` once a
 * Teacher grades them (see gradingController.js). An unanswered MCQ just
 * counts as wrong; an unanswered subjective question still goes to
 * "pending" review with an empty textAnswer.
 *
 * AI grade drafting (US-06) happens AFTER the response is sent, not
 * awaited here — a real Gemini call takes ~20s per question, and nothing
 * about submitting a quiz should make a student wait that long. The draft
 * lands whenever it lands; Grade Approvals just shows it if it's there.
 */
const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await loadOwnInProgressAttempt(req, res);

  const questions = await Question.find({ quiz: attempt.quiz }).select("+modelAnswer");
  const subjectiveQuestions = questions.filter((q) => q.type === "subjective");

  for (const q of subjectiveQuestions) {
    await Answer.findOneAndUpdate(
      { attempt: attempt._id, question: q._id },
      { gradeStatus: "pending" },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  attempt.submittedAt = new Date();
  await attempt.save();

  const finalAttempt = await recomputeAttemptScore(attempt._id);

  res.status(200).json({ success: true, data: finalAttempt });

  // Fire-and-forget, intentionally not awaited.
  Promise.all(subjectiveQuestions.map((q) => draftGradeInBackground(attempt._id, q))).catch(() => {});
});

/**
 * GET /api/attempts/:id/review (Student, own SUBMITTED attempt only)
 * Reveals correctOptionIndex/explanation/modelAnswer — never available
 * before this point (see Question.js's select:false on all three) — so a
 * student can learn from what they got right or wrong. Deliberately
 * gated on `attempt.submittedAt` existing: revealing the answer key to a
 * student still mid-attempt would let them just look it up and finish
 * the quiz with it, defeating the whole assessment.
 */
const getAttemptReview = asyncHandler(async (req, res) => {
  const attempt = await QuizAttempt.findById(req.params.id);
  if (!attempt) {
    res.status(404);
    throw new Error("Attempt not found");
  }
  if (String(attempt.student) !== String(req.user._id)) {
    res.status(403);
    throw new Error("This is not your attempt");
  }
  if (!attempt.submittedAt) {
    res.status(400);
    throw new Error("This attempt has not been submitted yet");
  }

  const [questions, answers] = await Promise.all([
    Question.find({ quiz: attempt.quiz }).select("+correctOptionIndex +explanation +modelAnswer").sort({ order: 1 }),
    Answer.find({ attempt: attempt._id }),
  ]);
  const answerByQuestion = new Map(answers.map((a) => [String(a.question), a]));

  const review = questions.map((q) => {
    const answer = answerByQuestion.get(String(q._id));
    const isMcq = q.type !== "subjective";
    return {
      _id: q._id,
      type: q.type,
      text: q.text,
      topic: q.topic,
      explanation: q.explanation,
      options: isMcq ? q.options : undefined,
      correctOptionIndex: isMcq ? q.correctOptionIndex : undefined,
      modelAnswer: isMcq ? undefined : q.modelAnswer,
      studentSelectedOptionIndex: answer?.selectedOptionIndex ?? null,
      studentTextAnswer: answer?.textAnswer ?? "",
      isCorrect: isMcq ? answer?.selectedOptionIndex === q.correctOptionIndex : undefined,
      gradeStatus: answer?.gradeStatus,
      score: answer?.score ?? null,
      feedback: answer?.feedback ?? "",
    };
  });

  res.status(200).json({ success: true, data: review });
});

module.exports = { autosaveAnswer, submitAttempt, getAttemptReview };
