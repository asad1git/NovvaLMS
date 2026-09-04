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
          topic: { type: "string" },
        },
        required: ["text", "options", "correctOptionIndex", "topic"],
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

const CHAT_SYSTEM_PROMPT =
  "You are a helpful teaching assistant for a university course. Answer the student's " +
  "question using ONLY the context below, extracted from the course's lecture materials. " +
  "Do not use any outside knowledge, even if you know the answer. If the answer is not " +
  'contained in the context, reply exactly: "I do not have enough context from the ' +
  'uploaded material." Keep answers clear and concise. Reply in plain text only — no ' +
  "markdown formatting (no **, #, or bullet characters), since this is a plain-text " +
  "chat window. Use plain sentences or simple numbered lines instead.\n\nCONTEXT:\n";

async function runChat(systemPrompt, context, question, history) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set OPENAI_API_KEY in .env");
  }

  const messages = [
    { role: "system", content: systemPrompt + context },
    ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    { role: "user", content: question },
  ];

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error("OpenAI returned no content");
  }

  return { answer };
}

/**
 * chat({ context, question, history }) -> { answer }
 * Same contract as geminiProvider.chat — never receives student PII, only
 * the retrieved context, the raw question, and prior turn content.
 */
async function chat({ context, question, history = [] }) {
  return runChat(CHAT_SYSTEM_PROMPT, context, question, history);
}

const PARENT_CHAT_SYSTEM_PROMPT =
  "You are an academic performance assistant helping a parent understand their child's " +
  "progress at university. Answer the parent's question using ONLY the performance data " +
  "below — do not invent grades, topics, or facts not present in it. If the data doesn't " +
  "cover what they're asking, say so honestly instead of guessing. Be supportive and " +
  "constructive — frame weak topics as where to focus study time next, not criticism. " +
  "Never state or guess the student's name, email, or any other identifying detail even " +
  "if asked — refer to them only as \"your child\" or \"the student\". Reply in plain " +
  "text only — no markdown formatting (no **, #, or bullet characters), since this is a " +
  "plain-text chat window.\n\nPERFORMANCE DATA:\n";

/**
 * parentChat({ context, question, history }) -> { answer }
 * Same contract as geminiProvider.parentChat.
 */
async function parentChat({ context, question, history = [] }) {
  return runChat(PARENT_CHAT_SYSTEM_PROMPT, context, question, history);
}

const GRADE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    justification: { type: "string" },
  },
  required: ["score", "justification"],
  additionalProperties: false,
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
 * Same contract and HITL caveat as geminiProvider.gradeSubjective.
 */
async function gradeSubjective({ question, maxScore, answer }) {
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
      messages: [{ role: "user", content: buildGradingPrompt(question, maxScore, answer) }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "grade", schema: GRADE_SCHEMA, strict: true },
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

  const parsed = JSON.parse(raw);
  if (typeof parsed.score !== "number") {
    throw new Error("OpenAI response missing a numeric score");
  }

  const score = Math.max(0, Math.min(maxScore, parsed.score));
  return { score, justification: parsed.justification || "" };
}

module.exports = { generateQuiz, chat, gradeSubjective, parentChat };
