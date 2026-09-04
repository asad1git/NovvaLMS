const mongoose = require("mongoose");

const parentLinkSchema = new mongoose.Schema(
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
  { timestamps: { createdAt: "linkedAt", updatedAt: false } }
);

// One parent can only be linked to a given student once (a student can still
// have multiple parents/guardians linked, and a parent multiple children).
parentLinkSchema.index({ parent: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("ParentLink", parentLinkSchema);
