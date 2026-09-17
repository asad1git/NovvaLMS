const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    // Points at the specific taught CourseOffering (term + teacher +
    // section), not the catalog Course — enrollment is inherently an
    // offering-level concept, matching a real registration.
    courseOffering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: [true, "Course offering is required"],
    },
  },
  { timestamps: { createdAt: "enrolledAt", updatedAt: false } }
);

// One student can only be enrolled in a given offering once.
enrollmentSchema.index({ student: 1, courseOffering: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
