const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Material = require("../models/Material");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");
const { MATERIALS_DIR } = require("../middleware/uploadMiddleware");

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

  const material = await Material.create({
    course: course._id,
    uploadedBy: req.user._id,
    title: req.body.title || req.file.originalname,
    fileName: req.file.originalname,
    fileUrl: req.file.filename,
    fileType,
    fileSize: req.file.size,
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
