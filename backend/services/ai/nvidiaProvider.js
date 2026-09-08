const MODEL = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

// NVIDIA's NIM API (build.nvidia.com) is OpenAI-compatible, so this mirrors
// openaiProvider.js almost exactly — same endpoint shape, same
// response_format.json_schema structured-output contract (confirmed with a
// real live call against nvidia/nemotron-3-ultra-550b-a55b before wiring
// this in). `chat_template_kwargs.enable_thinking` is Nemotron-specific and
// is explicitly disabled: Nemotron's reasoning mode returns chain-of-thought
// in a separate `reasoning_content` field, which we never want mixed into a
// JSON-schema response or a chat answer, and skipping it keeps latency down
// on a 550B-parameter model used as a fallback.
const CHAT_TEMPLATE_KWARGS = { enable_thinking: false };

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
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set NVIDIA_API_KEY in .env");
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
      chat_template_kwargs: CHAT_TEMPLATE_KWARGS,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: { name: "quiz", schema: QUIZ_SCHEMA, strict: true },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("NVIDIA returned no content");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error("NVIDIA returned invalid JSON");
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error("NVIDIA response missing a questions array");
  }

  return parsed;
}

const CHAT_SYSTEM_PROMPT =
  "You are Novva Assistant, a helpful AI assistant for this student in this university " +
  "course. You are given up to four labeled sections below: LECTURE EXCERPTS (snippets " +
  "from the course's uploaded materials relevant to the question, if any matched), " +
  "REQUESTED MATERIAL(S) (present only when the student named a specific uploaded file " +
  "directly, e.g. \"summarize Week 1 Slides\" — its full extracted content, or a note that " +
  "no extracted text is available for that file), COURSE MATERIALS (the titles of " +
  "everything uploaded for this course), and YOUR PERFORMANCE (this student's own quiz " +
  "scores and topic-by-topic breakdown in this course, if any exists yet).\n\n" +
  "Rules:\n" +
  "1. For a question about lecture content — including \"what's inside X\" / \"summarize X\" " +
  "for a named file — answer from LECTURE EXCERPTS and REQUESTED MATERIAL(S) (prefer " +
  "REQUESTED MATERIAL(S) when it covers the named file, since it has the fuller text). If " +
  "REQUESTED MATERIAL(S) says no extracted text is available for that file, tell the " +
  "student that plainly (it may be empty, corrupted, or an image-only scan) instead of " +
  "using the refusal phrase below. If neither section " +
  'covers what\'s asked, reply exactly: "I do not have enough context from the uploaded ' +
  'material." Never use outside knowledge for content questions, even if you know the ' +
  "answer.\n" +
  "2. For a question about what materials exist or a rundown of what's been uploaded, " +
  "answer from COURSE MATERIALS.\n" +
  "3. For a question about the student's own performance, weak areas, or how to improve, " +
  "answer from YOUR PERFORMANCE — name the weak topics, give concrete study suggestions, " +
  "and where relevant suggest which uploaded material (by title, from COURSE MATERIALS) " +
  'is likely to cover that topic — phrase this as a suggestion ("likely covers", "worth ' +
  'checking"), never as a guaranteed citation, since there is no confirmed link between ' +
  "topics and specific files.\n" +
  "4. Never invent a grade, topic, or fact not present in the sections below.\n" +
  "Keep answers clear and concise. Reply in plain text only — no markdown formatting " +
  "(no **, #, or bullet characters), since this is a plain-text chat window. Use plain " +
  "sentences or simple numbered lines instead.\n\n";

async function runChat(systemPrompt, context, question, history) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set NVIDIA_API_KEY in .env");
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
    body: JSON.stringify({ model: MODEL, messages, chat_template_kwargs: CHAT_TEMPLATE_KWARGS }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error("NVIDIA returned no content");
  }

  return { answer };
}

/**
 * chat({ context, question, history }) -> { answer }
 * Same contract as geminiProvider.chat / openaiProvider.chat.
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
 * Same contract as geminiProvider.parentChat / openaiProvider.parentChat.
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
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured — set NVIDIA_API_KEY in .env");
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
      chat_template_kwargs: CHAT_TEMPLATE_KWARGS,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: { name: "grade", schema: GRADE_SCHEMA, strict: true },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("NVIDIA returned no content");
  }

  const parsed = JSON.parse(raw);
  if (typeof parsed.score !== "number") {
    throw new Error("NVIDIA response missing a numeric score");
  }

  const score = Math.max(0, Math.min(maxScore, parsed.score));
  return { score, justification: parsed.justification || "" };
}

module.exports = { generateQuiz, chat, gradeSubjective, parentChat };
