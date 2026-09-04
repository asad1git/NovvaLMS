const mongoose = require("mongoose");

// One continuous thread per (parent, student) pair — same start-or-resume
// pattern as the student-facing ChatSession, but keyed by the parent-child
// relationship instead of course, since this chatbot answers from the
// child's overall academic performance, not one course's material.
const parentChatSessionSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Parent is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

parentChatSessionSchema.index({ parent: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("ParentChatSession", parentChatSessionSchema);
