const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Material = require("../models/Material");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");
const { MATERIALS_DIR } = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ragEngine");
const { verifyFileSignature } = require("../utils/verifyFileSignature");

// Below this many characters of extracted text, treat the file as
// effectively empty for AI purposes — a real slide can legitimately be
// short ("Introduction to Data Structures"), so this only needs to catch
// genuinely broken/blank files, not warn on every terse-but-real one.
const MIN_EXTRACTABLE_CHARS = 20;

/**
 * Attempts extraction right away so a teacher learns immediately if a file
 * has no usable text, instead of a student hitting it later via the
 * chatbot or AI quiz generation. Never blocks the upload — a warning, not
 * a rejection, since a human should decide whether an image-heavy deck is
 * still worth keeping as-is.
 */
async function checkExtractability(filePath, fileType) {
  try {
    const text = await extractText(filePath, fileType);
    if (!text || text.trim().length < MIN_EXTRACTABLE_CHARS) {
      return "This file has little or no extractable text — the AI chatbot and quiz generation " +
        "won't be able to use it. It may be empty, corrupted, or an image-only scan.";
    }
    return null;
  } catch (err) {
    return `This file could not be read (${err.message}) — the AI chatbot and quiz generation won't be able to use it.`;
  }
}

/**
 * US-04 — POST /api/courses/:id/materials (Admin or the course's Teacher)
 */
const uploadMaterial = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, course);

  if (!req.file) {
    res.status(400);
    throw new Error("A PDF, PPTX, or DOCX file is required (field name: file, max 20MB)");
  }

  const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
  const filePath = path.join(MATERIALS_DIR, req.file.filename);

  // uploadMiddleware's fileFilter only checked the extension string — a
  // renamed file (e.g. something.exe saved as something.pdf) would sail
  // straight through it. This confirms the actual bytes match what was
  // claimed before the file is ever attached to a course.
  const signatureMismatch = await verifyFileSignature(filePath, fileType);
  if (signatureMismatch) {
    fs.unlink(filePath, () => {}); // best-effort cleanup of the rejected upload
    res.status(400);
    throw new Error(signatureMismatch);
  }

  const textExtractionWarning = await checkExtractability(filePath, fileType);

  const material = await Material.create({
    course: course._id,
    uploadedBy: req.user._id,
    title: req.body.title || req.file.originalname,
    fileName: req.file.originalname,
    fileUrl: req.file.filename,
    fileType,
    fileSize: req.file.size,
    textExtractionWarning,
  });

  res.status(201).json({ success: true, data: material });
});

/**
 * GET /api/courses/:id/materials — Admin, the owning Teacher, or an
 * enrolled Student.
 */
const getMaterials = asyncHandler(async (req, res) => {
  const course = await assertCourseAccess(req.user, res, req.params.id);
  const materials = await Material.find({ course: course._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: materials });
});

/**
 * GET /api/materials/:id/download
 * Streams the file to whoever has access to its course. Deliberately not a
 * static file route — that would bypass `protect` and expose lecture
 * material to anyone with the URL.
 */
const downloadMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error("Material not found");
  }
  await assertCourseAccess(req.user, res, material.course);

  const filePath = path.join(MATERIALS_DIR, material.fileUrl);
  res.download(filePath, material.fileName);
});

/**
 * DELETE /api/materials/:id — Admin or the uploading course's Teacher.
 */
const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error("Material not found");
  }

  const course = await Course.findById(material.course);
  assertCourseManager(req.user, res, course);

  fs.unlink(path.join(MATERIALS_DIR, material.fileUrl), () => {}); // best-effort
  await material.deleteOne();

  res.status(200).json({ success: true, data: { _id: material._id } });
});

module.exports = { uploadMaterial, getMaterials, downloadMaterial, deleteMaterial };
