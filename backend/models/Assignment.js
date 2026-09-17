const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    courseOffering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: [true, "Course offering is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    maxScore: {
      type: Number,
      required: [true, "Max score is required"],
      min: [1, "Max score must be at least 1"],
    },
    // The question document the teacher uploads — same storage shape as
    // Material, since it goes through the same signature/extraction checks.
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
        values: ["pdf", "pptx", "docx", "txt", "jpg", "jpeg", "png", "zip"],
        message: "File must be PDF, PPTX, DOCX, TXT, JPG, PNG, or ZIP",
      },
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    textExtractionWarning: {
      type: String,
      default: null,
    },
    // Same shape and rationale as Question.modelAnswer/useRubricForGrading
    // — a teacher-written sample answer that can optionally guide
    // assignmentController's AI grading draft instead of grading "blind."
    // select:false: getAssignmentsForCourse spreads `...a.toObject()`
    // straight into the response for BOTH managers and students (unlike
    // Question, which is queried per-role) — without select:false this
    // would leak the rubric answer to a student before they've even
    // submitted, the exact leak Question.modelAnswer's own select:false
    // already guards against.
    modelAnswer: {
      type: String,
      trim: true,
      maxlength: [3000, "Model answer cannot exceed 3000 characters"],
      default: "",
      select: false,
    },
    useRubricForGrading: {
      type: Boolean,
      default: false,
    },
    // Same precomputed-embedding shape and rationale as Material.embeddings
    // — powers semantic ranking of ASSIGNMENT EXCERPTS in the chatbot.
    embeddings: [
      {
        chunkIndex: { type: Number, required: true },
        text: { type: String, required: true },
        vector: { type: [Number], required: true },
        _id: false,
      },
    ],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
