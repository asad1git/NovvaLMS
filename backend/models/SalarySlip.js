const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
    },
    month: {
      type: String,
      required: [true, "Month is required"],
      trim: true, // free-form, e.g. "September 2026" -- no need to over-model this
    },
    basicSalary: {
      type: Number,
      required: [true, "Basic salary is required"],
      min: [0, "Basic salary cannot be negative"],
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, "Allowances cannot be negative"],
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, "Deductions cannot be negative"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// Net salary is always derivable from the three inputs — a virtual avoids
// ever storing a value that could drift out of sync with them.
salarySlipSchema.virtual("netSalary").get(function () {
  return this.basicSalary + this.allowances - this.deductions;
});
salarySlipSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("SalarySlip", salarySlipSchema);
