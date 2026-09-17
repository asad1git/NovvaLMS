const mongoose = require("mongoose");

// A simple academic-department catalog — needed so a Department Head's
// "sees only their department" scoping has something concrete to scope to.
// Deliberately minimal (name + code only), same spirit as Term: additive,
// not a full org-chart model.
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Department name cannot exceed 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, "Department code cannot exceed 10 characters"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Department", departmentSchema);
