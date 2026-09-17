const mongoose = require("mongoose");

// One document per (student, courseOffering) — the final course grade a
// transcript actually reads. Mirrors the same HITL shape this project
// already uses everywhere else (Answer's aiDraftScore vs score,
// AssignmentSubmission's aiDraftScore vs score): a system-computed value
// the teacher reviews, and a separate finalized value that's the only
// thing that ever counts. The "system" here is a deterministic
// percentage aggregation, not an AI call — no provider involved, no cost,
// no latency, computed fresh on every read rather than cached.
const gradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    courseOffering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: [true, "Course offering is required"],
    },
    finalLetter: {
      type: String,
      required: [true, "Final letter grade is required"],
    },
    finalPoints: {
      type: Number,
      required: [true, "Final grade points is required"],
    },
    // The percentage the teacher actually finalized against — kept
    // alongside the letter/points so a transcript can show "87% (B+)",
    // not just the letter.
    finalPercentage: {
      type: Number,
      required: [true, "Final percentage is required"],
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Finalized-by is required"],
    },
    finalizedAt: {
      type: Date,
      required: [true, "Finalized-at is required"],
    },
  },
  { timestamps: { createdAt: false, updatedAt: "updatedAt" } }
);

// One final grade per student per offering — re-finalizing (a grade
// change) updates this same document rather than creating a second one.
gradeSchema.index({ student: 1, courseOffering: 1 }, { unique: true });

module.exports = mongoose.model("Grade", gradeSchema);
