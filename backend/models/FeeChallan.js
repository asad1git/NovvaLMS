const mongoose = require("mongoose");

const feeChallanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    // Set only for challans created by the auto-generate flow
    // (generateChallansForTerm) — lets a re-run skip a student who's
    // already been billed for that term without touching manually-created
    // challans, which have no term and are never auto-skipped.
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      default: null,
    },
    challanNumber: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: { values: ["unpaid", "paid"], message: "Status must be unpaid or paid" },
      default: "unpaid",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("FeeChallan", feeChallanSchema);
