const mongoose = require("mongoose");

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: [true, "Assignment is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: {
        values: ["pdf", "pptx", "docx"],
        message: "File must be PDF, PPTX, or DOCX",
      },
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    submittedAt: {
      type: Date,
      required: true,
    },
    // Computed once at submit time against the assignment's dueDate, not
    // derived on every read — the deadline it was measured against never
    // changes after the fact, so this is a stable historical fact worth
    // storing rather than recomputing (and it's what the teacher's
    // on-time/late column reads directly).
    isLate: {
      type: Boolean,
      required: true,
    },
    gradeStatus: {
      type: String,
      enum: { values: ["pending", "graded"], message: "Invalid grade status" },
      default: "pending",
    },
    score: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: "",
    },
    // HITL — mirrors Answer.aiDraftScore/aiDraftJustification exactly: a
    // draft only, never counted until a Teacher saves it via gradeSubmission.
    aiDraftScore: {
      type: Number,
      default: null,
    },
    aiDraftJustification: {
      type: String,
      default: "",
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

// One submission per student per assignment — resubmitting before grading
// updates this same document rather than creating a second row.
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
