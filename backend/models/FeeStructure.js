const mongoose = require("mongoose");

// One fee structure per Term — the rate an auto-generated challan is
// computed from (see feeChallanController.generateChallansForTerm), kept
// separate from FeeChallan itself since a rate is a policy set once per
// term, not a fact about any individual challan.
const feeStructureSchema = new mongoose.Schema(
  {
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      required: [true, "Term is required"],
      unique: true,
    },
    perCreditHourRate: {
      type: Number,
      required: [true, "Per-credit-hour rate is required"],
      min: [0, "Rate cannot be negative"],
    },
    fixedFees: {
      type: Number,
      default: 0,
      min: [0, "Fixed fees cannot be negative"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
