const asyncHandler = require("express-async-handler");
const ParentLink = require("../models/ParentLink");
const ParentChatSession = require("../models/ParentChatSession");
const ParentMessage = require("../models/ParentMessage");
const { computeAnalyticsForStudent } = require("./analyticsController");
const { getAIProvider } = require("../services/ai");

const HISTORY_TURNS = 6;

async function assertLinked(req, res) {
  const linked = await ParentLink.exists({ parent: req.user._id, student: req.params.studentId });
  if (!linked) {
    res.status(403);
    throw new Error("You are not linked to this student");
  }
}

async function getOrCreateSession(parentId, studentId) {
  let session = await ParentChatSession.findOne({ parent: parentId, student: studentId });
  if (!session) {
    session = await ParentChatSession.create({ parent: parentId, student: studentId });
  }
  return session;
}

/**
 * Builds the AI context from a student's analytics summary — topic/score
 * data only. Deliberately never includes the student's name or email, per
 * CLAUDE.md's PII rule; the frontend already knows which child this is
 * (shown in its own UI), so the AI never needs identity to answer.
 */
function buildAnalyticsContext(analytics) {
  const { attempts, topics, overall } = analytics;

  const lines = [
    `Total quizzes submitted: ${overall.totalAttempts}`,
    `Overall average score: ${overall.averagePercentage !== null ? overall.averagePercentage + "%" : "not yet available (no graded quizzes)"}`,
    "",
    "Performance by topic:",
  ];

  if (topics.length === 0) {
    lines.push("(no graded questions yet)");
  } else {
    for (const t of topics) {
      lines.push(`- ${t.topic}: ${t.pointsEarned}/${t.pointsPossible} points (${t.percentage}%)`);
    }
  }

  lines.push("", "Recent quiz results:");
  if (attempts.length === 0) {
    lines.push("(no quizzes submitted yet)");
  } else {
    for (const a of attempts.slice(0, 10)) {
      const scoreText = a.percentage !== null ? `${a.score}/${a.maxScore} (${a.percentage}%)` : "pending teacher review";
      lines.push(`- "${a.quizTitle}" (${a.courseTitle}): ${scoreText}`);
    }
  }

  return lines.join("\n");
}

/**
 * GET /api/parent-links/:studentId/chat/messages (Parent only)
 */
const getMessages = asyncHandler(async (req, res) => {
  await assertLinked(req, res);

  const session = await ParentChatSession.findOne({ parent: req.user._id, student: req.params.studentId });
  if (!session) {
    return res.status(200).json({ success: true, data: [] });
  }

  const messages = await ParentMessage.find({ session: session._id }).sort({ createdAt: 1 });
  res.status(200).json({ success: true, data: messages });
});

/**
 * POST /api/parent-links/:studentId/chat/messages (Parent only)
 * Same shape as the student chatbot's sendMessage, but grounded in the
 * child's analytics summary instead of RAG-selected lecture chunks.
 */
const sendMessage = asyncHandler(async (req, res) => {
  await assertLinked(req, res);

  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400);
    throw new Error("Message content is required");
  }

  const session = await getOrCreateSession(req.user._id, req.params.studentId);
  const userMessage = await ParentMessage.create({ session: session._id, role: "user", content: content.trim() });

  const priorMessages = await ParentMessage.find({ session: session._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_TURNS + 1)
    .then((docs) => docs.reverse());
  const history = priorMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

  const analytics = await computeAnalyticsForStudent(req.params.studentId);
  const context = buildAnalyticsContext(analytics);

  let answer;
  try {
    const provider = getAIProvider();
    const result = await provider.parentChat({ context, question: content.trim(), history });
    answer = result.answer;
  } catch (err) {
    res.status(502);
    throw new Error(`Chatbot failed to respond: ${err.message}`);
  }

  const assistantMessage = await ParentMessage.create({ session: session._id, role: "assistant", content: answer });

  res.status(201).json({ success: true, data: { userMessage, assistantMessage } });
});

module.exports = { getMessages, sendMessage };
