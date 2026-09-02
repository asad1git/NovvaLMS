const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: [true, "Quiz is required"],
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Student is required"],
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
    default: null,
  },
  score: {
    type: Number,
    default: null,
  },
  totalQuestions: {
    type: Number,
    default: null,
  },
  // Total points available across every question (MCQ:1 each + each
  // subjective question's own maxScore). Distinct from totalQuestions once
  // a quiz mixes question types.
  maxScore: {
    type: Number,
    default: null,
  },
  // False while any subjective answer on this attempt is still "pending" —
  // `score` is provisional (MCQ points only) until this flips true.
  gradingComplete: {
    type: Boolean,
    default: true,
  },
});

// One attempt per student per quiz.
quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
