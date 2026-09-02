const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  attempt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuizAttempt",
    required: [true, "Attempt is required"],
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: [true, "Question is required"],
  },
  selectedOptionIndex: {
    type: Number,
    default: null,
    min: 0,
    max: 3,
  },
  // Free-text response for a "subjective" question.
  textAnswer: {
    type: String,
    default: null,
    maxlength: [5000, "Answer cannot exceed 5000 characters"],
  },
  // HITL state for a subjective answer. "not_applicable" for MCQ (auto-graded
  // inline, never stored here). "pending" is set at submission; a Teacher's
  // grade transitions it to "graded" — this is the draft/approve seam that
  // Sprint 6's AI grading will plug an actual AI draft into later.
  gradeStatus: {
    type: String,
    enum: { values: ["not_applicable", "pending", "graded"], message: "Invalid grade status" },
    default: "not_applicable",
  },
  score: {
    type: Number,
    default: null,
    min: 0,
  },
  feedback: {
    type: String,
    default: "",
    maxlength: [2000, "Feedback cannot exceed 2000 characters"],
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  gradedAt: {
    type: Date,
    default: null,
  },
});

// One answer record per question per attempt — autosave upserts into this.
answerSchema.index({ attempt: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("Answer", answerSchema);
