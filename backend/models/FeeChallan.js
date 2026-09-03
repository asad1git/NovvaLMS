const mongoose = require("mongoose");

const feeChallanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
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
