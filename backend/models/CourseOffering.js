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
    // Seat limit + a running count, checked and incremented together in one
    // atomic findOneAndUpdate (see registrationController.js) — not via a
    // multi-document transaction. A single document's own atomicity is
    // actually the simpler, more portable fix for the classic "two students
    // grab the last seat at once" race: it works even on a standalone
    // (non-replica-set) MongoDB, unlike a transaction.
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      default: 30,
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: [0, "Enrolled count cannot go negative"],
    },
    // A manually-entered weekly meeting pattern — deliberately NOT an
    // auto-generated optimal timetable (a genuinely hard constraint-
    // satisfaction problem real SIS vendors have whole teams for, per the
    // roadmap doc's own risk assessment; out of scope here). Empty by
    // default so every pre-existing offering stays valid unchanged and is
    // simply never conflict-checked (see utils/scheduleConflict.js) — a
    // missing schedule can never itself cause or block a conflict.
    schedule: [
      {
        dayOfWeek: {
          type: Number,
          min: 0,
          max: 6,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
          match: [/^([01]\d|2[0-3]):[0-5]\d$/, "startTime must be in HH:MM 24-hour format"],
        },
        endTime: {
          type: String,
          required: true,
          match: [/^([01]\d|2[0-3]):[0-5]\d$/, "endTime must be in HH:MM 24-hour format"],
        },
        room: {
          type: String,
          trim: true,
          maxlength: [40, "Room cannot exceed 40 characters"],
          default: "",
        },
      },
    ],
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
