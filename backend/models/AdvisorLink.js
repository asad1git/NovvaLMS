const mongoose = require("mongoose");

// Same shape as ParentLink — an admin-managed join collection, not an
// embedded array — mapping an `advisor`-role User to a `student`-role User
// they may view the registration/transcript of. See ParentLink's own
// comment for why this shape (a student can have multiple advisors over
// time, an advisor multiple advisees) beats an embedded array.
const advisorLinkSchema = new mongoose.Schema(
  {
    advisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Advisor is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
  },
  { timestamps: { createdAt: "linkedAt", updatedAt: false } }
);

advisorLinkSchema.index({ advisor: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AdvisorLink", advisorLinkSchema);
