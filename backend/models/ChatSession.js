const mongoose = require("mongoose");

// One continuous thread per (student, course) pair — auto-created on first
// message, like QuizAttempt's start-or-resume pattern. No session-switching
// UI to build; the student just has one ongoing conversation per course.
const chatSessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    courseOffering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: [true, "Course offering is required"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

chatSessionSchema.index({ student: 1, courseOffering: 1 }, { unique: true });

module.exports = mongoose.model("ChatSession", chatSessionSchema);
