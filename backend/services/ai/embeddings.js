/**
 * Real embedding-based retrieval for the RAG chatbot — the upgrade from
 * ragEngine.js's original keyword-overlap chunk selection (TF-style term
 * matching), which misses a paraphrased question that shares no vocabulary
 * with a genuinely relevant chunk (e.g. "how does binary search work"
 * against a chunk that says "the bisection method locates a value").
 *
 * Deliberately NOT part of the services/ai/index.js failover chain: a
 * cosine-similarity comparison is only meaningful between two vectors from
 * the SAME embedding model/space. If a chunk's vector came from Gemini's
 * embedding model and a query vector came from a different provider's
 * embedding model after failover, comparing them would silently produce
 * garbage rankings rather than a visible error — worse than no fallback at
 * all. This module always uses Gemini directly; every caller (ragEngine.js)
 * treats any failure here as "no embeddings available" and degrades to
 * keyword overlap instead, never to a different provider's embeddings.
 */
// "text-embedding-004" (an earlier guess) turned out to already be
// unavailable for this API version — same class of model-retirement issue
// CLAUDE.md already documents for the chat model. Confirmed via a live
// ListModels call which embedding models this API key actually supports;
// env-overridable so a future retirement is an env var change, not a code
// change, matching GEMINI_MODEL's own precedent.
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const BATCH_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;

// Gemini's documented per-call limit for batchEmbedContents. Chunking into
// batches of this size keeps this correct even for an unusually
// material-heavy course, rather than silently truncating or erroring above it.
const MAX_BATCH_SIZE = 100;

/**
 * Embeds an array of plain-text strings, batched, returning a same-length,
 * same-order array of number[] vectors. Throws (never returns partial or
 * fabricated data) if GEMINI_API_KEY is unset or any batch call fails —
 * every caller is expected to catch this and degrade to keyword-overlap
 * retrieval, never to silently rank against wrong/empty vectors.
 */
async function embedTexts(texts) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Embeddings are not configured — set GEMINI_API_KEY in .env");
  }
  if (texts.length === 0) return [];

  const vectors = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const response = await fetch(`${BATCH_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: batch.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        })),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini embedding API error (${response.status}): ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.embeddings) || data.embeddings.length !== batch.length) {
      throw new Error("Gemini embedding API returned an unexpected shape");
    }
    vectors.push(...data.embeddings.map((e) => e.values));
  }

  return vectors;
}

/**
 * Embeds a single string — chat-time retrieval only ever needs one vector
 * at a time (the student's question), so this skips the batch-array
 * plumbing for that call site.
 */
async function embedQuery(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}

/**
 * Standard cosine similarity — the actual ranking signal for semantic
 * retrieval, in [-1, 1]. Genuinely relevant same-topic chunks against
 * text-embedding-004 typically score well above the SEMANTIC_SIMILARITY_
 * THRESHOLD ragEngine.js applies; unrelated text usually falls below it.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { embedTexts, embedQuery, cosineSimilarity, EMBEDDING_MODEL };
