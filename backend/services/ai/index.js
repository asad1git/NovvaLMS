/**
 * External AI Service Layer (per CLAUDE.md's architecture diagram).
 *
 * Every provider implements the same contract: `generateQuiz({ text,
 * numQuestions })` -> `{ questions: [{ text, options: [4 strings],
 * correctOptionIndex }] }`. Swapping providers is an env var + restart,
 * never a code change — that's the whole point of this layer existing.
 */
function getAIProvider() {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini") return require("./geminiProvider");
  if (provider === "openai") return require("./openaiProvider");

  throw new Error(`Unknown AI_PROVIDER "${provider}" — expected "gemini" or "openai"`);
}

module.exports = { getAIProvider };
