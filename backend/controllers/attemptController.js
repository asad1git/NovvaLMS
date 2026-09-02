const asyncHandler = require("express-async-handler");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const QuizAttempt = require("../models/QuizAttempt");
const Answer = require("../models/Answer");
const { recomputeAttemptScore } = require("../utils/scoring");

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
 * US-08 / HITL — POST /api/attempts/:id/submit (Student, own attempt only)
 * MCQ answers are graded immediately. Subjective answers can't be — they're
 * marked "pending" here and picked up in `recomputeAttemptScore` once a
 * Teacher grades them (see gradingController.js). An unanswered MCQ just
 * counts as wrong; an unanswered subjective question still goes to
 * "pending" review with an empty textAnswer.
 */
const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await loadOwnInProgressAttempt(req, res);

  const questions = await Question.find({ quiz: attempt.quiz });
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
});

module.exports = { autosaveAnswer, submitAttempt };
