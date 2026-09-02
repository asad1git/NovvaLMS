const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
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
    // Which materials' chunks were used to ground an assistant reply —
    // shown in the UI so the RAG grounding is visible, not a black box.
    sources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
      },
    ],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Message", messageSchema);
