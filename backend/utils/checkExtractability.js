const { extractText } = require("../services/ragEngine");

// Below this many characters of extracted text, treat the file as
// effectively empty for AI purposes — a real slide/assignment can
// legitimately be short ("Introduction to Data Structures"), so this only
// needs to catch genuinely broken/blank files, not warn on every terse-but-real one.
const MIN_EXTRACTABLE_CHARS = 20;

/**
 * Attempts extraction right away so the uploader learns immediately if a
 * file has no usable text, instead of it surfacing much later via the
 * chatbot, AI quiz generation, or AI-assisted grading. Never blocks the
 * upload — a warning, not a rejection, since a human should decide whether
 * an image-heavy file is still worth keeping as-is. Shared by
 * materialController (materials) and assignmentController (question docs
 * and student submissions) — identical check, same reasoning, in every case.
 */
async function checkExtractability(filePath, fileType) {
  try {
    const text = await extractText(filePath, fileType);
    if (!text || text.trim().length < MIN_EXTRACTABLE_CHARS) {
      return "This file has little or no extractable text — AI features won't be able to use it. " +
        "It may be empty, corrupted, or an image-only scan.";
    }
    return null;
  } catch (err) {
    return `This file could not be read (${err.message}) — AI features won't be able to use it.`;
  }
}

module.exports = { checkExtractability, MIN_EXTRACTABLE_CHARS };
