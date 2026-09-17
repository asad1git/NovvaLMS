const mongoose = require("mongoose");

// The foundational split: Course (below) is now a pure catalog entry —
// "CS201 — Data Structures" exists once, forever, independent of who
// teaches it or when. A CourseOffering is the actual taught instance —
// "CS201, Section A, Fall 2026, taught by Dr. Khan" — and is what every
// other collection (Enrollment, Material, Quiz, Assignment,
// AttendanceSession, ChatSession) actually attaches to via their
// `courseOffering` field, not the catalog Course directly. This is what
// makes "the same course taught by two teachers in the same term" or
// "the same course taught across two different terms" representable at
// all — under the old single Course model both were a data-modeling
// contradiction.
const courseOfferingSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      required: [true, "Term is required"],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher is required"],
    },
    // Defaults to a single section ("A") — multiple sections of the same
    // catalog course in the same term are supported by this field, but
    // this pass doesn't build any UI that creates more than one.
    sectionLabel: {
      type: String,
      trim: true,
      default: "A",
      maxlength: [10, "Section label cannot exceed 10 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// The same catalog course can't be offered twice in the same term under
// the same section label — a real duplicate, not a legitimate second
// section (which would carry a different sectionLabel).
courseOfferingSchema.index({ course: 1, term: 1, sectionLabel: 1 }, { unique: true });

module.exports = mongoose.model("CourseOffering", courseOfferingSchema);
