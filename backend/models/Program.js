const mongoose = require("mongoose");

// A degree program with a FIXED list of required courses — the simplified,
// tractable version of a degree audit the roadmap doc scoped this to.
// Deliberately not modeling elective categories, transfer credit, or a
// minimum-grade-per-course rule: those are the kind of feature real SIS
// products spend years on, and full generality isn't worth chasing here.
const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Program name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Program name cannot exceed 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Program code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [15, "Program code cannot exceed 15 characters"],
    },
    requiredCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    totalCreditHoursRequired: {
      type: Number,
      required: [true, "Total credit hours required is required"],
      min: [1, "Total credit hours required must be at least 1"],
    },
    // The cumulative GPA floor to graduate — separate from the probation/
    // suspension thresholds in degreeAuditController, which are fixed
    // academic-standing bands, not a per-program setting.
    minGpaToGraduate: {
      type: Number,
      default: 2.0,
      min: 0,
      max: 4,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Program", programSchema);
