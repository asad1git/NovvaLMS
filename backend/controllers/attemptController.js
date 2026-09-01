const asyncHandler = require("express-async-handler");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const QuizAttempt = require("../models/QuizAttempt");
const Answer = require("../models/Answer");

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
 */
const autosaveAnswer = asyncHandler(async (req, res) => {
  const attempt = await loadOwnInProgressAttempt(req, res);

  const quiz = await Quiz.findById(attempt.quiz);
  const deadline = new Date(attempt.startedAt.getTime() + quiz.durationMinutes * 60 * 1000);
  if (new Date() > deadline) {
    res.status(400);
    throw new Error("Time limit exceeded");
  }

  const { questionId, selectedOptionIndex } = req.body;
  const question = await Question.findOne({ _id: questionId, quiz: attempt.quiz });
  if (!question) {
    res.status(400);
    throw new Error("Question does not belong to this quiz");
  }

  const answer = await Answer.findOneAndUpdate(
    { attempt: attempt._id, question: question._id },
    { selectedOptionIndex },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: answer });
});

/**
 * US-08 — POST /api/attempts/:id/submit (Student, own attempt only)
 * Grades by comparing every Answer against Question.correctOptionIndex.
 * An unanswered question just counts as wrong — no special-casing needed.
 */
const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await loadOwnInProgressAttempt(req, res);

  const questions = await Question.find({ quiz: attempt.quiz }).select("+correctOptionIndex");
  const answers = await Answer.find({ attempt: attempt._id });
  const selectedByQuestion = new Map(answers.map((a) => [String(a.question), a.selectedOptionIndex]));

  let score = 0;
  for (const q of questions) {
    if (selectedByQuestion.get(String(q._id)) === q.correctOptionIndex) score++;
  }

  attempt.score = score;
  attempt.totalQuestions = questions.length;
  attempt.submittedAt = new Date();
  await attempt.save();

  res.status(200).json({ success: true, data: attempt });
});

module.exports = { autosaveAnswer, submitAttempt };
