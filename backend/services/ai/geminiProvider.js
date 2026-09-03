const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Structured-output schema — this is what CLAUDE.md's Sprint 5 goal calls
// "JSON enforcement": Gemini is constrained to return exactly this shape,
// so there's no free-text response to parse/guess at.
const QUIZ_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
          correctOptionIndex: { type: "INTEGER" },
          topic: { type: "STRING" },
        },
        required: ["text", "options", "correctOptionIndex", "topic"],
      },
    },
  },
  required: ["questions"],
};

function buildPrompt(text, numQuestions) {
  return (
    `You are helping a university teacher create a multiple-choice quiz from their lecture material.\n` +
    `Generate exactly ${numQuestions} multiple-choice questions that test understanding of the material below.\n` +
    `Each question must have exactly 4 options and exactly one correct answer (correctOptionIndex, 0-3).\n` +
    `For each question, also include a short "topic" tag (1-3 words, e.g. "Arrays", "Recursion") ` +
    `naming the specific concept it tests — this powers weak-topic analytics for students.\n` +
    `Base every question strictly on the material — do not invent facts not present in it.\n\n` +
    `LECTURE MATERIAL:\n${text}`
  );
}

/**
 * generateQuiz({ text, numQuestions }) -> { questions: [...] }
 * `text` is lecture content only — never student PII, per CLAUDE.md's rule.
 */
async function generateQuiz({ text, numQuestions }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set GEMINI_API_KEY in .env");
  }

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(text, numQuestions) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Gemini returned no content");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error("Gemini returned invalid JSON");
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error("Gemini response missing a questions array");
  }

  return parsed;
}

const CHAT_SYSTEM_PROMPT =
  "You are a helpful teaching assistant for a university course. Answer the student's " +
  "question using ONLY the context below, extracted from the course's lecture materials. " +
  "Do not use any outside knowledge, even if you know the answer. If the answer is not " +
  'contained in the context, reply exactly: "I do not have enough context from the ' +
  'uploaded material." Keep answers clear and concise. Reply in plain text only — no ' +
  "markdown formatting (no **, #, or bullet characters), since this is a plain-text " +
  "chat window. Use plain sentences or simple numbered lines instead.\n\nCONTEXT:\n";

/**
 * chat({ context, question, history }) -> { answer }
 * RAG steps 4-5 (per CLAUDE.md): the caller has already selected the
 * relevant chunks (`context`) — this only ever injects that + the raw
 * question + prior turns, never student PII (no name/email is ever part
 * of `history`/`question`, by construction of the caller).
 */
async function chat({ context, question, history = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set GEMINI_API_KEY in .env");
  }

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: question }] },
  ];

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT + context }] },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) {
    throw new Error("Gemini returned no content");
  }

  return { answer };
}

const GRADE_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "NUMBER" },
    justification: { type: "STRING" },
  },
  required: ["score", "justification"],
};

function buildGradingPrompt(question, maxScore, answer) {
  return (
    `You are drafting a grade for a university student's short-answer response. A teacher\n` +
    `will review this draft before it counts as the final grade, so be fair and explain your reasoning.\n\n` +
    `Question: ${question}\n` +
    `Maximum possible score: ${maxScore}\n` +
    `Student's answer: ${answer || "(no answer provided)"}\n\n` +
    `Award a score from 0 to ${maxScore} based on how well the answer addresses the question. ` +
    `Provide a brief (1-2 sentence) justification for the score.`
  );
}

/**
 * gradeSubjective({ question, maxScore, answer }) -> { score, justification }
 * Drafts a HITL grade — per CLAUDE.md, this is never the final grade. Called
 * from attemptController.submitAttempt in the background; a Teacher must
 * still review and save a grade via Grade Approvals before it counts.
 */
async function gradeSubjective({ question, maxScore, answer }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set GEMINI_API_KEY in .env");
  }

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildGradingPrompt(question, maxScore, answer) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GRADE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Gemini returned no content");
  }

  const parsed = JSON.parse(raw);
  if (typeof parsed.score !== "number") {
    throw new Error("Gemini response missing a numeric score");
  }

  // Never trust external AI output blindly, even with schema enforcement.
  const score = Math.max(0, Math.min(maxScore, parsed.score));
  return { score, justification: parsed.justification || "" };
}

module.exports = { generateQuiz, chat, gradeSubjective };
