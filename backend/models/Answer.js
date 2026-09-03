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
  // grade transitions it to "graded" — this is the draft/approve seam
  // Sprint 6's AI grading plugs into (see aiDraftScore/aiDraftJustification).
  gradeStatus: {
    type: String,
    enum: { values: ["not_applicable", "pending", "graded"], message: "Invalid grade status" },
    default: "not_applicable",
  },
  // Final grade — set ONLY when a Teacher approves (gradeAnswer), never by
  // the AI directly. Kept separate from the AI's draft below so approval
  // logic and scoring.js's contribution rules never had to change when AI
  // drafting was added.
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
  // AI's suggested score/justification, drafted in the background right
  // after submission (see attemptController.submitAttempt). Purely
  // informational until a Teacher reviews it in Grade Approvals and saves
  // a grade (which may accept this as-is or override it) — the HITL rule
  // in CLAUDE.md means these fields alone never make a grade final.
  aiDraftScore: {
    type: Number,
    default: null,
  },
  aiDraftJustification: {
    type: String,
    default: "",
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
