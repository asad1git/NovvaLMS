/**
 * External AI Service Layer (per CLAUDE.md's architecture diagram).
 *
 * Every provider implements the same contract: `generateQuiz({ text,
 * numQuestions })`, `chat({ context, question, history })`,
 * `gradeSubjective({ question, maxScore, answer })`, and
 * `parentChat({ context, question, history })`. Swapping providers is an env
 * var + restart, never a code change — that's the whole point of this layer
 * existing, and every controller only ever calls through `getAIProvider()`.
 *
 * Automatic failover: AI_PROVIDER_CHAIN is a comma-separated priority list
 * (e.g. "gemini,nvidia"). Each of the four methods below tries providers in
 * that order and moves to the next one on ANY failure (rate limit, server
 * error, timeout, malformed response) — the caller never sees a difference
 * except the answer/draft simply arrives, so no controller needed to change.
 * If every provider in the chain fails, the original per-provider error
 * messages are preserved so the caller's existing "AI not configured" /
 * "AI generation failed" handling still makes sense to a teacher/student.
 * AI_PROVIDER (a single provider name) is kept as a fallback for anyone
 * still on the pre-failover single-provider setup — used only when
 * AI_PROVIDER_CHAIN is unset.
 */
const PROVIDER_LOADERS = {
  gemini: () => require("./geminiProvider"),
  openai: () => require("./openaiProvider"),
  nvidia: () => require("./nvidiaProvider"),
};

function getProviderChain() {
  const raw = process.env.AI_PROVIDER_CHAIN || process.env.AI_PROVIDER || "gemini";
  const names = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (names.length === 0) {
    throw new Error('AI_PROVIDER_CHAIN / AI_PROVIDER resolved to no providers — set e.g. "gemini,nvidia"');
  }

  const unknown = names.filter((n) => !PROVIDER_LOADERS[n]);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown AI provider(s) "${unknown.join(", ")}" — expected one of: ${Object.keys(PROVIDER_LOADERS).join(", ")}`
    );
  }

  return names;
}

async function callWithFailover(methodName, args) {
  const chain = getProviderChain();
  let lastError;

  for (const name of chain) {
    try {
      const provider = PROVIDER_LOADERS[name]();
      const result = await provider[methodName](args);
      if (name !== chain[0]) {
        console.warn(`[AI] ${methodName} served by fallback provider "${name}" (earlier provider(s) in the chain failed)`);
      }
      return result;
    } catch (err) {
      console.warn(`[AI] ${methodName} failed on provider "${name}": ${err.message}`);
      lastError = err;
    }
  }

  throw lastError;
}

/**
 * Streaming counterpart to callWithFailover. Once a provider has yielded at
 * least one delta, we're committed to it — the caller (chatController) is
 * writing those deltas straight to an already-open HTTP response, so
 * failing over mid-stream would corrupt what's already been sent. Failover
 * only happens BEFORE the first delta (e.g. a bad API key rejected
 * immediately, before any token streamed) — the exact same "try the next
 * provider" behavior callWithFailover already has, just gated on whether
 * anything has been yielded yet. A provider with no streaming method falls
 * back to its plain (non-"Stream") method and yields the whole answer as
 * one delta, so failover still produces a complete response even without
 * incremental UX for that particular provider.
 */
async function* streamWithFailover(methodName, args) {
  const chain = getProviderChain();
  let lastError;

  for (const name of chain) {
    const provider = PROVIDER_LOADERS[name]();
    let startedYielding = false;

    try {
      if (typeof provider[methodName] === "function") {
        for await (const delta of provider[methodName](args)) {
          startedYielding = true;
          yield delta;
        }
      } else {
        const nonStreamingMethod = methodName.replace(/Stream$/, "");
        const result = await provider[nonStreamingMethod](args);
        startedYielding = true;
        yield result.answer;
      }
      if (name !== chain[0]) {
        console.warn(`[AI] ${methodName} served by fallback provider "${name}" (earlier provider(s) in the chain failed)`);
      }
      return;
    } catch (err) {
      console.warn(`[AI] ${methodName} failed on provider "${name}": ${err.message}`);
      lastError = err;
      if (startedYielding) {
        throw err; // already streamed partial content — can't safely retry with a different provider
      }
    }
  }

  throw lastError;
}

function getAIProvider() {
  return {
    generateQuiz: (args) => callWithFailover("generateQuiz", args),
    chat: (args) => callWithFailover("chat", args),
    chatStream: (args) => streamWithFailover("chatStream", args),
    gradeSubjective: (args) => callWithFailover("gradeSubjective", args),
    parentChat: (args) => callWithFailover("parentChat", args),
  };
}

module.exports = { getAIProvider };
