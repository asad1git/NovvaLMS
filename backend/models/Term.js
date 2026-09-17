const mongoose = require("mongoose");

// The academic calendar anchor everything else in the university-oriented
// model hangs off — a CourseOffering belongs to exactly one Term. Kept
// deliberately minimal for this foundation pass (name + date range +
// which one is "current"); registration windows, add/drop deadlines, etc.
// are a later addition on top of this, not a reason to block on now.
const termSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Term name is required"],
      trim: true,
      unique: true,
      maxlength: [60, "Term name cannot exceed 60 characters"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    // Exactly one Term is expected to be "current" at a time in normal use
    // (enforced by convention/UI, not a DB constraint — a second admin
    // marking a different term current is a real scenario, not a bug),
    // used to default new CourseOfferings to the right term.
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Term", termSchema);
