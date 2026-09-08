const fs = require("fs");
const path = require("path");
const multer = require("multer");

const MATERIALS_DIR = path.join(__dirname, "..", "uploads", "materials");
fs.mkdirSync(MATERIALS_DIR, { recursive: true });

// PDF/PPTX/DOCX are the AI-readable set (RAG chatbot, quiz generation,
// AI-assisted grading all extract text from these). JPG/PNG/ZIP were added
// on request for non-text course content (e.g. a photographed handwritten
// answer, a code-submission archive) — they upload, verify, download, and
// list exactly like the others, but text extraction is intentionally not
// attempted for them (see ragEngine.extractText's dispatcher); AI features
// just note "no usable text" the same way an image-only PDF scan already
// does, rather than blocking the upload.
const ALLOWED_MATERIAL_EXTENSIONS = [".pdf", ".pptx", ".docx", ".jpg", ".jpeg", ".png", ".zip"];
const MAX_MATERIAL_SIZE = 20 * 1024 * 1024; // US-04: 20MB max

/**
 * Shared by Materials and the two Assignment file slots (question doc,
 * student submission) — all three accept the same file types and 20MB cap,
 * only the destination directory differs, so this factors the disk-storage
 * + fileFilter setup once instead of three near-identical multer configs.
 */
function makeDocumentUpload(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: MAX_MATERIAL_SIZE },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_MATERIAL_EXTENSIONS.includes(ext)) {
        const err = new Error("Only PDF, PPTX, DOCX, JPG, PNG, or ZIP files are allowed");
        err.statusCode = 400;
        return cb(err);
      }
      cb(null, true);
    },
  });
}

const uploadMaterialFile = makeDocumentUpload(MATERIALS_DIR);

const ASSIGNMENT_QUESTIONS_DIR = path.join(__dirname, "..", "uploads", "assignments", "questions");
const ASSIGNMENT_SUBMISSIONS_DIR = path.join(__dirname, "..", "uploads", "assignments", "submissions");
const uploadAssignmentQuestionFile = makeDocumentUpload(ASSIGNMENT_QUESTIONS_DIR);
const uploadAssignmentSubmissionFile = makeDocumentUpload(ASSIGNMENT_SUBMISSIONS_DIR);

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

module.exports = {
  uploadMaterialFile,
  uploadCSV,
  MATERIALS_DIR,
  uploadAssignmentQuestionFile,
  uploadAssignmentSubmissionFile,
  ASSIGNMENT_QUESTIONS_DIR,
  ASSIGNMENT_SUBMISSIONS_DIR,
};
