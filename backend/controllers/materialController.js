const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Material = require("../models/Material");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");
const { MATERIALS_DIR } = require("../middleware/uploadMiddleware");
const { verifyFileSignature } = require("../utils/verifyFileSignature");
const { checkExtractability } = require("../utils/checkExtractability");

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
    throw new Error("A PDF, PPTX, DOCX, TXT, JPG, PNG, or ZIP file is required (field name: file, max 20MB)");
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
 * PUT /api/materials/:id/replace (Admin or the owning course's Teacher)
 * Swaps a material's underlying file in place — same `_id`, so anything
 * that already references this material (a generated quiz's provenance,
 * the chatbot's `Message.sources` citations, `findMentionedMaterials`
 * title lookups) keeps working, instead of a re-upload creating a
 * confusing duplicate Material row alongside the old one. `title` stays
 * unless a new one is explicitly given; the file, its type, size, and
 * extraction warning are always refreshed from the new upload.
 */
const replaceMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) {
    res.status(404);
    throw new Error("Material not found");
  }

  const course = await Course.findById(material.course);
  assertCourseManager(req.user, res, course);

  if (!req.file) {
    res.status(400);
    throw new Error("A PDF, PPTX, DOCX, TXT, JPG, PNG, or ZIP file is required (field name: file, max 20MB)");
  }

  const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
  const filePath = path.join(MATERIALS_DIR, req.file.filename);

  const signatureMismatch = await verifyFileSignature(filePath, fileType);
  if (signatureMismatch) {
    fs.unlink(filePath, () => {}); // best-effort cleanup of the rejected upload
    res.status(400);
    throw new Error(signatureMismatch);
  }

  const textExtractionWarning = await checkExtractability(filePath, fileType);

  const oldFileUrl = material.fileUrl;

  material.fileName = req.file.originalname;
  material.fileUrl = req.file.filename;
  material.fileType = fileType;
  material.fileSize = req.file.size;
  material.textExtractionWarning = textExtractionWarning;
  if (req.body.title) material.title = req.body.title;
  await material.save();

  fs.unlink(path.join(MATERIALS_DIR, oldFileUrl), () => {}); // best-effort — only after the new file is safely attached

  res.status(200).json({ success: true, data: material });
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

module.exports = { uploadMaterial, getMaterials, downloadMaterial, replaceMaterial, deleteMaterial };
