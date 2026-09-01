const fs = require("fs");
const path = require("path");
const multer = require("multer");

const MATERIALS_DIR = path.join(__dirname, "..", "uploads", "materials");
fs.mkdirSync(MATERIALS_DIR, { recursive: true });

const ALLOWED_MATERIAL_EXTENSIONS = [".pdf", ".pptx", ".docx"];
const MAX_MATERIAL_SIZE = 20 * 1024 * 1024; // US-04: 20MB max

const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MATERIALS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const uploadMaterialFile = multer({
  storage: materialStorage,
  limits: { fileSize: MAX_MATERIAL_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MATERIAL_EXTENSIONS.includes(ext)) {
      const err = new Error("Only PDF, PPTX, or DOCX files are allowed");
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

// CSV bulk-enrollment: small, kept in memory (req.file.buffer) and never
// written to disk — it's parsed once and discarded, unlike lecture files.
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // generous for a list of emails
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".csv") {
      const err = new Error("Only .csv files are allowed");
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = { uploadMaterialFile, uploadCSV, MATERIALS_DIR };
