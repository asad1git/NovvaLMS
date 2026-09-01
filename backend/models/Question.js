const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: [true, "Quiz is required"],
  },
  text: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
    maxlength: [1000, "Question text cannot exceed 1000 characters"],
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length === 4 && arr.every((o) => o && o.trim().length > 0),
      message: "Exactly 4 non-empty options are required",
    },
  },
  // Never sent to a student taking the quiz — mirrors User.passwordHash's
  // select:false pattern. Only explicitly `.select("+correctOptionIndex")`
  // for the owning teacher/admin, or server-side when computing a grade.
  correctOptionIndex: {
    type: Number,
    required: [true, "Correct option index is required"],
    min: 0,
    max: 3,
    select: false,
  },
  order: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Question", questionSchema);
