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

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "of", "in", "on",
  "to", "for", "and", "or", "but", "with", "as", "at", "by", "from", "that", "this",
  "it", "its", "what", "which", "who", "how", "why", "when", "where", "do", "does",
  "did", "can", "could", "would", "should", "will", "shall", "i", "you", "we", "they",
  "he", "she", "them", "their", "our", "your", "my", "me", "us",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/**
 * RAG step 3 — select the most relevant chunks for the query, per CLAUDE.md.
 * Keyword-overlap scoring rather than embeddings: this project's local
 * MongoDB has no vector search index, and adding a whole embeddings
 * pipeline (generate + store + cosine-similarity search) is a much bigger
 * lift than a lecture-material chatbot at this scale actually needs. This
 * is a real, classic retrieval strategy (TF-style term overlap), not a
 * placeholder — it can be swapped for embedding-based ranking later behind
 * the same function signature if that ever becomes worth the complexity.
 *
 * `chunksWithSource` is [{ text, materialId, materialTitle }, ...]. Returns
 * the top `topK` by score, each score > 0 — chunks with zero keyword
 * overlap are dropped rather than padded in, so a genuinely unrelated
 * question yields no context at all (and the caller can short-circuit to
 * the "not enough context" refusal instead of guessing).
 */
function selectRelevantChunks(chunksWithSource, query, topK = 5) {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return [];

  const scored = chunksWithSource.map((c) => {
    const chunkWords = new Set(tokenize(c.text));
    let score = 0;
    for (const w of queryWords) {
      if (chunkWords.has(w)) score++;
    }
    return { ...c, score };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Crude singular/plural normalization ("slides" -> "slide") so a question
// naming a material doesn't miss it purely over pluralization — good enough
// at this project's scale without a real stemmer.
function normalizeToken(w) {
  return w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w;
}

/**
 * Detects when a question names a specific uploaded material by title
 * (e.g. "summarize Week 1 Slides", "what's inside Week 1 Slides") rather
 * than asking about content that would surface via `selectRelevantChunks`.
 * A plain title reference rarely shares vocabulary with the material's
 * actual body text — "Week 1 Slides" is metadata, not something that
 * necessarily appears inside the slides themselves — so keyword-scoring the
 * question against chunk *content* alone misses these requests entirely.
 * This scores the question's tokens against each material's *title*
 * instead, returning any material where most of its title's tokens appear
 * in the question. `materials` needs at least `_id`/`title` per entry.
 */
function findMentionedMaterials(question, materials) {
  const questionTokens = new Set(tokenize(question).map(normalizeToken));
  if (questionTokens.size === 0) return [];

  return materials.filter((m) => {
    const titleTokens = tokenize(m.title).map(normalizeToken);
    if (titleTokens.length === 0) return false;
    const matched = titleTokens.filter((t) => questionTokens.has(t)).length;
    return matched / titleTokens.length >= 0.6;
  });
}

module.exports = { extractTextFromPdf, chunkText, selectRelevantChunks, findMentionedMaterials };
