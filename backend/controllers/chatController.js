const path = require("path");
const asyncHandler = require("express-async-handler");
const CourseOffering = require("../models/CourseOffering");
const Enrollment = require("../models/Enrollment");
const Material = require("../models/Material");
const Assignment = require("../models/Assignment");
const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const { MATERIALS_DIR, ASSIGNMENT_QUESTIONS_DIR } = require("../middleware/uploadMiddleware");
const {
  extractText,
  chunkText,
  selectRelevantChunksSemantic,
  classifyGenuineSources,
  findMentionedMaterials,
} = require("../services/ragEngine");
const { getAIProvider } = require("../services/ai");
const { computeAnalyticsForStudent } = require("./analyticsController");
const { formatAnalyticsSummary } = require("../utils/formatAnalyticsSummary");

const NO_CONTEXT_REPLY = "I do not have enough context from the uploaded material.";
const HISTORY_TURNS = 6; // recent messages kept for conversational continuity

async function assertEnrolled(req, res) {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) {
    res.status(404);
    throw new Error("Course not found");
  }
  const enrolled = await Enrollment.exists({ student: req.user._id, courseOffering: offering._id });
  if (!enrolled) {
    res.status(403);
    throw new Error("You are not enrolled in this course");
  }
  return offering;
}

async function getOrCreateSession(studentId, offeringId) {
  let session = await ChatSession.findOne({ student: studentId, courseOffering: offeringId });
  if (!session) {
    session = await ChatSession.create({ student: studentId, courseOffering: offeringId });
  }
  return session;
}

/**
 * Builds { chunksWithSource } from every material in the course offering —
 * PDF, PPTX, and DOCX all supported via `ragEngine.extractText`'s
 * per-fileType dispatch. A material with precomputed embeddings (see
 * materialController.js's background embedding job) skips extraction
 * entirely — its stored {text, vector} pairs are used directly, both
 * faster (no PDF/DOCX parsing on every chat message) and correct (the
 * vector is only meaningful against the exact chunk text it was computed
 * from). A material without embeddings yet (uploaded before this feature
 * existed, or its background job hasn't finished) still gets extracted +
 * chunked fresh, exactly as before — it just won't have a `.vector`, so
 * `ragEngine.selectRelevantChunksSemantic` ranks it by keyword overlap
 * instead of dropping it.
 */
async function buildCourseChunks(offeringId) {
  const materials = await Material.find({ courseOffering: offeringId });
  const chunksWithSource = [];

  for (const material of materials) {
    if (material.embeddings?.length > 0) {
      for (const e of material.embeddings) {
        chunksWithSource.push({ text: e.text, vector: e.vector, materialId: material._id, materialTitle: material.title });
      }
      continue;
    }

    const filePath = path.join(MATERIALS_DIR, material.fileUrl);
    let text;
    try {
      text = await extractText(filePath, material.fileType);
    } catch (err) {
      continue; // skip unreadable/corrupt files rather than fail the whole chat
    }
    for (const chunk of chunkText(text)) {
      chunksWithSource.push({ text: chunk, materialId: material._id, materialTitle: material.title });
    }
  }

  return chunksWithSource;
}

/**
 * Every material in the course (any file type, not just PDF), for the
 * "what's been uploaded" meta-question the assistant can now answer without
 * a content chunk needing to match.
 */
function formatMaterialsList(materials) {
  if (materials.length === 0) return "(none uploaded yet)";
  return materials.map((m) => `- ${m.title} (${m.fileType})`).join("\n");
}

/**
 * Chunks every assignment's question document, same shape as
 * buildCourseChunks but tagged assignmentId/assignmentTitle (never
 * materialId/materialTitle — Message.sources is `ref: "Material"` only, so
 * an assignment's _id must never be pushed into that array; assignment
 * content grounds answers here without ever becoming a citation pill).
 */
async function buildAssignmentChunks(offeringId) {
  const assignments = await Assignment.find({ courseOffering: offeringId });
  const chunksWithSource = [];

  for (const assignment of assignments) {
    if (assignment.embeddings?.length > 0) {
      for (const e of assignment.embeddings) {
        chunksWithSource.push({
          text: e.text,
          vector: e.vector,
          assignmentId: assignment._id,
          assignmentTitle: assignment.title,
        });
      }
      continue;
    }

    const filePath = path.join(ASSIGNMENT_QUESTIONS_DIR, assignment.fileUrl);
    let text;
    try {
      text = await extractText(filePath, assignment.fileType);
    } catch (err) {
      continue; // skip unreadable/corrupt files rather than fail the whole chat
    }
    for (const chunk of chunkText(text)) {
      chunksWithSource.push({ text: chunk, assignmentId: assignment._id, assignmentTitle: assignment.title });
    }
  }

  return chunksWithSource;
}

/**
 * Every assignment in the course, for "what assignments are due" /
 * "what's due this week" meta-questions — always included, same principle
 * as formatMaterialsList, so this works without a content chunk matching.
 */
function formatAssignmentsList(assignments) {
  if (assignments.length === 0) return "(none posted yet)";
  const now = new Date();
  return assignments
    .map((a) => `- ${a.title} (due ${new Date(a.dueDate).toLocaleString()}${now > a.dueDate ? ", past due" : ""})`)
    .join("\n");
}

/**
 * Full text of any assignment the student named directly ("what is
 * Assignment 2 asking", "summarize the essay assignment"), mirroring
 * buildRequestedMaterialSection — a title reference rarely shares
 * vocabulary with the question document's own body text, so relevance
 * scoring alone would usually miss it.
 */
function buildRequestedAssignmentSection(mentionedAssignments, assignmentChunksWithSource) {
  if (mentionedAssignments.length === 0) return "";

  const blocks = mentionedAssignments.map((a) => {
    const chunks = assignmentChunksWithSource.filter((c) => String(c.assignmentId) === String(a._id));
    if (chunks.length === 0) {
      return `"${a.title}" — no extracted text could be found for this file (it may be empty, corrupted, or an image-only scan with no text layer).`;
    }
    const fullText = chunks.map((c) => c.text).join(" ").slice(0, MAX_REQUESTED_MATERIAL_CHARS);
    return `"${a.title}" (due ${new Date(a.dueDate).toLocaleString()}, full content since the student named it directly):\n${fullText}`;
  });

  return blocks.join("\n\n---\n\n");
}

const MAX_REQUESTED_MATERIAL_CHARS = 20000; // per material, mirrors quizController's MAX_SOURCE_CHARS pattern

/**
 * When the student names a material directly ("summarize Week 1 Slides"),
 * `selectRelevantChunks`'s top-5 keyword match against the question is the
 * wrong tool — a title reference rarely shares vocabulary with the file's
 * actual body text, so it would usually surface nothing. This pulls that
 * material's FULL extracted content instead, so "what's inside X" /
 * "summarize X" genuinely works rather than hitting the refusal.
 */
function buildRequestedMaterialSection(mentionedMaterials, chunksWithSource) {
  if (mentionedMaterials.length === 0) return { text: "", materialIds: [] };

  const materialIds = [];
  const blocks = mentionedMaterials.map((m) => {
    const materialChunks = chunksWithSource.filter((c) => String(c.materialId) === String(m._id));
    if (materialChunks.length === 0) {
      return `"${m.title}" — no extracted text could be found for this file (it may be empty, corrupted, or an image-only scan with no text layer).`;
    }
    materialIds.push(String(m._id));
    const fullText = materialChunks.map((c) => c.text).join(" ").slice(0, MAX_REQUESTED_MATERIAL_CHARS);
    return `"${m.title}" (full content, since the student named it directly):\n${fullText}`;
  });

  return { text: blocks.join("\n\n---\n\n"), materialIds };
}

/**
 * US-07 — GET /api/courses/:id/chat/messages (Student, enrolled). :id is a
 * CourseOffering id.
 */
const getMessages = asyncHandler(async (req, res) => {
  const offering = await assertEnrolled(req, res);
  const session = await ChatSession.findOne({ student: req.user._id, courseOffering: offering._id });
  if (!session) {
    return res.status(200).json({ success: true, data: [] });
  }

  const messages = await Message.find({ session: session._id })
    .populate("sources", "title")
    .sort({ createdAt: 1 });

  res.status(200).json({ success: true, data: messages });
});

/**
 * US-07 — POST /api/courses/:id/chat/messages (Student, enrolled). :id is a
 * CourseOffering id. RAG steps 1-5 per CLAUDE.md: extract -> chunk ->
 * select relevant chunks -> inject as context -> strict "context-only"
 * system prompt for lecture content. Also gives the assistant
 * offering-scoped weak-area awareness (reusing the same aggregation US-11's
 * Analytics page uses), a list of every uploaded material, and — when the
 * question names a material directly ("summarize Week 1 Slides") — that
 * material's full extracted content, since a title reference rarely shares
 * vocabulary with the file's actual body text and would otherwise miss
 * `selectRelevantChunks`'s keyword scoring entirely. None of "what's been
 * uploaded", "where am I weak", or "summarize <material>" are
 * lecture-content questions, so the RAG chunk gate shouldn't block any of
 * them. Assignments (question docs + due dates) get the exact same
 * treatment via a parallel, separately-tagged chunk pool
 * (`buildAssignmentChunks`) — kept out of `sourceMaterialIds` since
 * `Message.sources` is `ref: "Material"` only, so an Assignment's `_id`
 * would never resolve there.
 *
 * The zero-cost refusal (no AI call at all) is reserved for the genuinely
 * empty case — no matched chunks, no named-material/assignment match, no
 * materials or assignments at all, AND no quiz history — "correctness by
 * construction" for a course with nothing to discuss at all. Once there's
 * *anything* to ground on, the AI is trusted to route the right section to
 * the right question per its system prompt's strict per-section rules
 * (still refusing content questions none of LECTURE EXCERPTS, REQUESTED
 * MATERIAL(S), ASSIGNMENT EXCERPTS, or REQUESTED ASSIGNMENT(S) cover,
 * verbatim).
 */
const sendMessage = asyncHandler(async (req, res) => {
  const offering = await assertEnrolled(req, res);

  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400);
    throw new Error("Message content is required");
  }

  const session = await getOrCreateSession(req.user._id, offering._id);

  const userMessage = await Message.create({ session: session._id, role: "user", content: content.trim() });

  const priorMessages = await Message.find({ session: session._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_TURNS + 1) // +1 to exclude the just-created user message below
    .then((docs) => docs.reverse());
  const history = priorMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

  const [chunksWithSource, materials, assignmentChunksWithSource, assignments, analytics] = await Promise.all([
    buildCourseChunks(offering._id),
    Material.find({ courseOffering: offering._id }).select("title fileType"),
    buildAssignmentChunks(offering._id),
    Assignment.find({ courseOffering: offering._id }).select("title dueDate description"),
    computeAnalyticsForStudent(req.user._id, { courseOfferingId: offering._id }),
  ]);
  const relevant = await selectRelevantChunksSemantic(chunksWithSource, content, 5);
  const mentionedMaterials = findMentionedMaterials(content, materials);
  const requestedMaterial = buildRequestedMaterialSection(mentionedMaterials, chunksWithSource);

  const relevantAssignmentExcerpts = await selectRelevantChunksSemantic(assignmentChunksWithSource, content, 3);
  const mentionedAssignments = findMentionedMaterials(content, assignments);
  const requestedAssignmentText = buildRequestedAssignmentSection(mentionedAssignments, assignmentChunksWithSource);

  const hasLectureExcerpts = relevant.length > 0;
  const hasRequestedMaterial = requestedMaterial.text !== "";
  const hasMaterials = materials.length > 0;
  const hasAssignmentExcerpts = relevantAssignmentExcerpts.length > 0;
  const hasRequestedAssignment = requestedAssignmentText !== "";
  const hasAssignments = assignments.length > 0;
  const hasPerformanceData = analytics.overall.totalAttempts > 0;

  const hasAnyContext =
    hasLectureExcerpts ||
    hasRequestedMaterial ||
    hasMaterials ||
    hasAssignmentExcerpts ||
    hasRequestedAssignment ||
    hasAssignments ||
    hasPerformanceData;

  // Everything above is a normal await chain — a failure there (bad course
  // id, not enrolled, etc.) still produces a normal JSON error response via
  // asyncHandler, since no response headers have been sent yet. Once we
  // start writing the NDJSON stream below, we're committed: an error from
  // here on has to become an "error" event on the stream itself, never a
  // res.status()/throw, since Express can't set headers a second time on an
  // already-started response.
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy response buffering so deltas flush immediately
  res.write(JSON.stringify({ type: "start", userMessage }) + "\n");

  let answer = "";
  try {
    if (!hasAnyContext) {
      answer = NO_CONTEXT_REPLY;
      res.write(JSON.stringify({ type: "delta", text: answer }) + "\n");
    } else {
      const context = [
        `LECTURE EXCERPTS:\n${hasLectureExcerpts ? relevant.map((c) => c.text).join("\n---\n") : "(none matched this question)"}`,
        hasRequestedMaterial ? `REQUESTED MATERIAL(S):\n${requestedMaterial.text}` : "",
        `COURSE MATERIALS:\n${formatMaterialsList(materials)}`,
        `ASSIGNMENT EXCERPTS:\n${hasAssignmentExcerpts ? relevantAssignmentExcerpts.map((c) => c.text).join("\n---\n") : "(none matched this question)"}`,
        hasRequestedAssignment ? `REQUESTED ASSIGNMENT(S):\n${requestedAssignmentText}` : "",
        `ASSIGNMENTS:\n${formatAssignmentsList(assignments)}`,
        `YOUR PERFORMANCE:\n${formatAnalyticsSummary(analytics)}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const provider = getAIProvider();
      for await (const delta of provider.chatStream({ context, question: content.trim(), history })) {
        answer += delta;
        res.write(JSON.stringify({ type: "delta", text: delta }) + "\n");
      }
      if (!answer) {
        throw new Error("AI provider returned no content");
      }
    }
  } catch (err) {
    res.write(JSON.stringify({ type: "error", message: `Chatbot failed to respond: ${err.message}` }) + "\n");
    return res.end();
  }

  // Classified from the ANSWER itself, not from what merely matched the
  // QUESTION — see ragEngine.classifyGenuineSources's own comment for why
  // this fixes the "citation attributed to the wrong context section"
  // imprecision CLAUDE.md previously documented as unfixed. REQUESTED
  // MATERIAL(S) stays unconditionally attributed — that path injects a
  // specific named material's FULL text, so there's no real ambiguity
  // about whether the answer could have come from it.
  const genuineRelevant = hasLectureExcerpts ? await classifyGenuineSources(answer, relevant) : [];
  const sourceMaterialIds = [
    ...new Set([...genuineRelevant.map((c) => String(c.materialId)), ...requestedMaterial.materialIds]),
  ];

  const assistantMessage = await Message.create({
    session: session._id,
    role: "assistant",
    content: answer,
    sources: sourceMaterialIds,
  });
  await assistantMessage.populate("sources", "title");

  res.write(JSON.stringify({ type: "done", assistantMessage }) + "\n");
  res.end();
});

module.exports = { getMessages, sendMessage };
