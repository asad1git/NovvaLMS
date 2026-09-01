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
});

// One answer record per question per attempt — autosave upserts into this.
answerSchema.index({ attempt: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("Answer", answerSchema);
