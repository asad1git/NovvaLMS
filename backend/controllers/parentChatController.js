const asyncHandler = require("express-async-handler");
const ParentLink = require("../models/ParentLink");
const ParentChatSession = require("../models/ParentChatSession");
const ParentMessage = require("../models/ParentMessage");
const { computeAnalyticsForStudent } = require("./analyticsController");
const { formatAnalyticsSummary } = require("../utils/formatAnalyticsSummary");
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
 * Same shape as the student chatbot's sendMessage (streamed NDJSON, same
 * "everything before the stream starts can still be a normal JSON error
 * response, everything after has to become an 'error' event on the stream
 * itself" split), but grounded in the child's analytics summary instead of
 * RAG-selected lecture chunks — no sources to classify here at all, since
 * ParentMessage has no `sources` field (there's nothing to cite, per
 * CLAUDE.md — the context is analytics data, not documents).
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
  const context = formatAnalyticsSummary(analytics);

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.write(JSON.stringify({ type: "start", userMessage }) + "\n");

  let answer = "";
  try {
    const provider = getAIProvider();
    for await (const delta of provider.parentChatStream({ context, question: content.trim(), history })) {
      answer += delta;
      res.write(JSON.stringify({ type: "delta", text: delta }) + "\n");
    }
    if (!answer) {
      throw new Error("AI provider returned no content");
    }
  } catch (err) {
    res.write(JSON.stringify({ type: "error", message: `Chatbot failed to respond: ${err.message}` }) + "\n");
    return res.end();
  }

  const assistantMessage = await ParentMessage.create({ session: session._id, role: "assistant", content: answer });

  res.write(JSON.stringify({ type: "done", assistantMessage }) + "\n");
  res.end();
});

module.exports = { getMessages, sendMessage };
