const fs = require("fs");
const { PDFParse } = require("pdf-parse");

/**
 * RAG step 1 (per CLAUDE.md) — extract lecture text. PDF only for now,
 * matching the SDS's stated approach; PPTX/DOCX extraction is a later
 * addition once a library choice is made for those formats.
 *
 * pdf-parse v2's API is class-based (v1's `pdf(buffer)` function export was
 * removed) — `new PDFParse({ data: buffer }).getText()`.
 */
async function extractTextFromPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  return text;
}

/**
 * RAG step 2 — split into ~chunkSize-word overlapping chunks. Word count is
 * a rough token approximation, good enough for this project's scale.
 * Quiz generation (US-05) currently uses the full extracted text rather
 * than a chunk subset, since a whole lecture-note-sized PDF fits comfortably
 * in a modern LLM's context window and the goal is quiz coverage across the
 * whole document. This function exists now — and is chunk-based, not just a
 * placeholder — because US-07's chatbot genuinely needs relevance-ranked
 * chunk selection against a specific student question, and will consume it
 * directly.
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  const step = Math.max(1, chunkSize - overlap);
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + chunkSize).join(" "));
    if (start + chunkSize >= words.length) break;
  }
  return chunks;
}

module.exports = { extractTextFromPdf, chunkText };
