const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    courseOffering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseOffering",
      required: [true, "Course offering is required"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    fileName: {
      type: String,
      required: true, // original filename, for display/download
    },
    // Storage key today (a filename under backend/uploads/materials); when
    // Sprint 3's local-disk storage is later swapped for S3/Cloudinary this
    // field holds the remote URL instead — the name is chosen to survive
    // that swap without a migration.
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
    // Set at upload time by attempting text extraction immediately, so a
    // teacher learns right away that a file has no usable text (empty,
    // corrupted, or an image-only scan) instead of a student discovering it
    // much later via the chatbot or AI quiz generation. Null means either
    // extraction succeeded, or hasn't been checked yet (materials uploaded
    // before this field existed).
    textExtractionWarning: {
      type: String,
      default: null,
    },
    // Precomputed at upload/replace time (in the background — see
    // materialController.js) via Gemini's embedding API, so the chatbot's
    // retrieval (chatController.buildCourseChunks +
    // ragEngine.selectRelevantChunksSemantic) can rank chunks by genuine
    // semantic similarity instead of only keyword overlap, without
    // re-extracting/re-embedding on every chat message. Empty for every
    // material uploaded before this feature existed — never backfilled,
    // same precedent as textExtractionWarning above — so those just keep
    // using keyword-overlap retrieval until re-uploaded.
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

module.exports = mongoose.model("Material", materialSchema);
