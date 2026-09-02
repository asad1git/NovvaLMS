const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

// Same JSON-schema-enforced contract as geminiProvider.js, via OpenAI's
// structured-output feature — swapping AI_PROVIDER=openai must produce the
// exact same { questions: [...] } shape without any caller-side changes.
const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctOptionIndex: { type: "integer" },
        },
        required: ["text", "options", "correctOptionIndex"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set OPENAI_API_KEY in .env");
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: buildPrompt(text, numQuestions) }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "quiz", schema: QUIZ_SCHEMA, strict: true },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned no content");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error("OpenAI returned invalid JSON");
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error("OpenAI response missing a questions array");
  }

  return parsed;
}

module.exports = { generateQuiz };
