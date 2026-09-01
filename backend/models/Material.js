const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
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
        values: ["pdf", "pptx", "docx"],
        message: "File must be PDF, PPTX, or DOCX",
      },
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Material", materialSchema);
