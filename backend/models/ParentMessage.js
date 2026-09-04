const mongoose = require("mongoose");

// Same shape as the student-facing Message, minus `sources` — a parent-chat
// reply is grounded in analytics data, not cited course materials, so
// there's nothing to link back to.
const parentMessageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParentChatSession",
      required: [true, "Session is required"],
    },
    role: {
      type: String,
      enum: { values: ["user", "assistant"], message: "Role must be user or assistant" },
      required: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("ParentMessage", parentMessageSchema);
