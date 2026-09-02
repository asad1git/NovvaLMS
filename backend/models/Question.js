const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: [true, "Quiz is required"],
  },
  // "mcq" is auto-graded at submission. "subjective" (short-answer/essay)
  // can't be auto-graded — it goes to "pending" and awaits a Teacher's HITL
  // review via the grading endpoints, per CLAUDE.md's HITL rule.
  type: {
    type: String,
    enum: { values: ["mcq", "subjective"], message: "Type must be mcq or subjective" },
    default: "mcq",
  },
  text: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
    maxlength: [1000, "Question text cannot exceed 1000 characters"],
  },
  options: {
    type: [String],
    required: function () {
      return this.type === "mcq";
    },
    validate: {
      validator: function (arr) {
        if (this.type !== "mcq") return true;
        return Array.isArray(arr) && arr.length === 4 && arr.every((o) => o && o.trim().length > 0);
      },
      message: "Exactly 4 non-empty options are required for MCQ questions",
    },
  },
  // Never sent to a student taking the quiz — mirrors User.passwordHash's
  // select:false pattern. Only explicitly `.select("+correctOptionIndex")`
  // for the owning teacher/admin, or server-side when computing a grade.
  correctOptionIndex: {
    type: Number,
    required: function () {
      return this.type === "mcq";
    },
    min: 0,
    max: 3,
    select: false,
  },
  // Points a subjective answer can be awarded (MCQ is always worth 1 and
  // ignores this field, to keep existing scoring behavior unchanged).
  maxScore: {
    type: Number,
    default: 1,
    min: 1,
  },
  order: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Question", questionSchema);
