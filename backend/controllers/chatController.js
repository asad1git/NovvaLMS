const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Material = require("../models/Material");
const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const { MATERIALS_DIR } = require("../middleware/uploadMiddleware");
const { extractTextFromPdf, chunkText, selectRelevantChunks } = require("../services/ragEngine");
const { getAIProvider } = require("../services/ai");

const NO_CONTEXT_REPLY = "I do not have enough context from the uploaded material.";
const HISTORY_TURNS = 6; // recent messages kept for conversational continuity

async function assertEnrolled(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  const enrolled = await Enrollment.exists({ student: req.user._id, course: course._id });
  if (!enrolled) {
    res.status(403);
    throw new Error("You are not enrolled in this course");
  }
  return course;
}

async function getOrCreateSession(studentId, courseId) {
  let session = await ChatSession.findOne({ student: studentId, course: courseId });
  if (!session) {
    session = await ChatSession.create({ student: studentId, course: courseId });
  }
  return session;
}

/**
 * Builds { chunksWithSource } from every PDF material in the course. Kept
 * simple (re-extracted per request, no caching) — reasonable at this
 * project's scale; see CLAUDE.md for the tradeoff note.
 */
async function buildCourseChunks(courseId) {
  const materials = await Material.find({ course: courseId, fileType: "pdf" });
  const chunksWithSource = [];

  for (const material of materials) {
    const filePath = path.join(MATERIALS_DIR, material.fileUrl);
    let text;
    try {
      text = await extractTextFromPdf(filePath);
    } catch (err) {
      continue; // skip unreadable files rather than fail the whole chat
    }
    for (const chunk of chunkText(text)) {
      chunksWithSource.push({ text: chunk, materialId: material._id, materialTitle: material.title });
    }
  }

  return chunksWithSource;
}

/**
 * US-07 — GET /api/courses/:id/chat/messages (Student, enrolled)
 */
const getMessages = asyncHandler(async (req, res) => {
  const course = await assertEnrolled(req, res);
  const session = await ChatSession.findOne({ student: req.user._id, course: course._id });
  if (!session) {
    return res.status(200).json({ success: true, data: [] });
  }

  const messages = await Message.find({ session: session._id })
    .populate("sources", "title")
    .sort({ createdAt: 1 });

  res.status(200).json({ success: true, data: messages });
});

/**
 * US-07 — POST /api/courses/:id/chat/messages (Student, enrolled)
 * RAG steps 1-5 per CLAUDE.md: extract -> chunk -> select relevant chunks
 * -> inject as context -> strict "context-only" system prompt. If nothing
 * relevant is found, short-circuits to the exact required refusal message
 * without ever calling the AI — correctness by construction rather than
 * hoping the model complies with an empty-context instruction.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const course = await assertEnrolled(req, res);

  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400);
    throw new Error("Message content is required");
  }

  const session = await getOrCreateSession(req.user._id, course._id);

  const userMessage = await Message.create({ session: session._id, role: "user", content: content.trim() });

  const priorMessages = await Message.find({ session: session._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_TURNS + 1) // +1 to exclude the just-created user message below
    .then((docs) => docs.reverse());
  const history = priorMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

  const chunksWithSource = await buildCourseChunks(course._id);
  const relevant = selectRelevantChunks(chunksWithSource, content, 5);

  let answer;
  let sourceMaterialIds = [];

  if (relevant.length === 0) {
    answer = NO_CONTEXT_REPLY;
  } else {
    const context = relevant.map((c) => c.text).join("\n---\n");
    sourceMaterialIds = [...new Set(relevant.map((c) => String(c.materialId)))];

    try {
      const provider = getAIProvider();
      const result = await provider.chat({ context, question: content.trim(), history });
      answer = result.answer;
    } catch (err) {
      res.status(502);
      throw new Error(`Chatbot failed to respond: ${err.message}`);
    }
  }

  const assistantMessage = await Message.create({
    session: session._id,
    role: "assistant",
    content: answer,
    sources: sourceMaterialIds,
  });
  await assistantMessage.populate("sources", "title");

  res.status(201).json({ success: true, data: { userMessage, assistantMessage } });
});

module.exports = { getMessages, sendMessage };
