const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const JSZip = require("jszip");
const { embedTexts, embedQuery, cosineSimilarity } = require("./ai/embeddings");

/**
 * RAG step 1 (per CLAUDE.md) — extract lecture text.
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
 * DOCX extraction via mammoth — a .docx is a zip of XML parts under the
 * hood, but mammoth handles that entirely; this only needs its raw-text
 * mode, no HTML conversion, since chunking/RAG only wants plain text.
 */
async function extractTextFromDocx(filePath) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value;
}

/**
 * PPTX extraction — a .pptx is a zip archive with one XML file per slide
 * (`ppt/slides/slideN.xml`), each text run wrapped in a `<a:t>` DrawingML
 * tag. No PPTX-specific parser dependency needed: JSZip (well-maintained,
 * pure JS, already a natural fit for any Office Open XML format) unzips it,
 * then a plain regex pulls every `<a:t>` run's text out in slide order.
 * Good enough for RAG-style plain-text extraction; doesn't attempt to
 * preserve layout, tables, or speaker notes.
 */
async function extractTextFromPptx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)\.xml$/)[1]);
      const numB = Number(b.match(/slide(\d+)\.xml$/)[1]);
      return numA - numB;
    });

  const slideTexts = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("text");
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    slideTexts.push(runs.join(" "));
  }

  return slideTexts.join("\n\n");
}

/**
 * Plain text needs no parsing at all — read it as UTF-8 directly. Unlike
 * jpg/png/zip below, this is genuinely useful content for RAG/quiz
 * generation/grading, not just another "no usable text" type.
 */
async function extractTextFromTxt(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Dispatches to the right extractor for a Material's `fileType`.
 * pdf/docx/pptx/txt have real text-extraction support — jpg/jpeg/png/zip
 * are valid upload types (see uploadMiddleware) but have no meaningful
 * single "extracted text" (an image needs OCR, a zip is a whole archive of
 * arbitrary files), so this throws a clear, expected error for them
 * rather than attempting something. Every caller already treats an
 * extraction failure as non-fatal — checkExtractability turns it into a
 * plain warning, buildCourseChunks/buildAssignmentChunks just skip the
 * file — exactly the same tolerant handling an image-only PDF scan (zero
 * extractable text, not an error) already gets.
 */
async function extractText(filePath, fileType) {
  if (fileType === "pdf") return extractTextFromPdf(filePath);
  if (fileType === "docx") return extractTextFromDocx(filePath);
  if (fileType === "pptx") return extractTextFromPptx(filePath);
  if (fileType === "txt") return extractTextFromTxt(filePath);
  if (["jpg", "jpeg", "png", "zip"].includes(fileType)) {
    throw new Error(`Text extraction is not supported for ${fileType.toUpperCase()} files`);
  }
  throw new Error(`Unsupported file type for text extraction: ${fileType}`);
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

/**
 * Computes {chunkIndex, text, vector} for every chunk of `text`, via
 * Gemini's embedding API (services/ai/embeddings.js) — the one-time cost
 * paid at upload/replace time (in the background, so a teacher's upload
 * response never waits on a network call — see materialController.js),
 * not on every chat message. Tolerant of any failure (API down, not
 * configured, rate-limited): returns `[]` rather than throwing, the exact
 * same philosophy as checkExtractability.js — a missing embedding just
 * degrades that material's retrieval back to keyword overlap, it never
 * breaks the upload or the chatbot.
 */
async function computeChunkEmbeddings(text) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return [];

  try {
    const vectors = await embedTexts(chunks);
    return chunks.map((chunkStr, i) => ({ chunkIndex: i, text: chunkStr, vector: vectors[i] }));
  } catch (err) {
    console.warn(`[Embeddings] Failed to compute chunk embeddings: ${err.message}`);
    return [];
  }
}

// Cosine-similarity floor for a chunk to count as "relevant" — genuinely
// on-topic chunks against text-embedding-004 typically score well above
// this; unrelated content usually falls below it. Deliberately a fixed
// constant rather than per-course tunable, matching this project's
// existing "simple, not fully general" scoping calls elsewhere.
const SEMANTIC_SIMILARITY_THRESHOLD = 0.5;

/**
 * RAG step 3, upgraded: semantic (embedding cosine-similarity) selection
 * when precomputed vectors are available, degrading to the original
 * keyword-overlap `selectRelevantChunks` otherwise — either because no
 * chunk in this pool has a vector yet (a material uploaded before
 * embeddings existed, or its background embedding job hasn't finished),
 * or because embedding the query itself failed at request time (API
 * down/rate-limited). Chunks WITHOUT a vector are still ranked by keyword
 * overlap rather than silently dropped, so a legacy material doesn't just
 * vanish from retrieval until it's re-uploaded.
 */
async function selectRelevantChunksSemantic(chunksWithSource, query, topK = 5) {
  const withVectors = chunksWithSource.filter((c) => c.vector);
  const withoutVectors = chunksWithSource.filter((c) => !c.vector);

  if (withVectors.length === 0) {
    return selectRelevantChunks(chunksWithSource, query, topK);
  }

  let semanticResults;
  try {
    const queryVector = await embedQuery(query);
    semanticResults = withVectors
      .map((c) => ({ ...c, score: cosineSimilarity(queryVector, c.vector) }))
      .filter((c) => c.score > SEMANTIC_SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    // Embedding the query failed at request time — fall back to pure
    // keyword overlap across EVERY chunk (vectors or not), exactly the
    // pre-embeddings behavior, so a transient failure never breaks
    // retrieval outright.
    console.warn(`[Embeddings] Failed to embed query, falling back to keyword overlap: ${err.message}`);
    return selectRelevantChunks(chunksWithSource, query, topK);
  }

  const keywordResults = withoutVectors.length > 0 ? selectRelevantChunks(withoutVectors, query, topK) : [];

  return [...semanticResults, ...keywordResults].slice(0, topK);
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

module.exports = {
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromPptx,
  extractTextFromTxt,
  extractText,
  chunkText,
  selectRelevantChunks,
  selectRelevantChunksSemantic,
  computeChunkEmbeddings,
  findMentionedMaterials,
};
