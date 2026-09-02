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
        },
        required: ["text", "options", "correctOptionIndex"],
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

module.exports = { generateQuiz };
