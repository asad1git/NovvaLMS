const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const QuizAttempt = require("../models/QuizAttempt");
const Answer = require("../models/Answer");
const Material = require("../models/Material");
const { assertCourseManager } = require("../utils/courseAccess");
const { MATERIALS_DIR } = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ragEngine");
const { getAIProvider } = require("../services/ai");

const MAX_SOURCE_CHARS = 30000; // keeps the prompt size sane regardless of provider

function isManagerOf(user, course) {
  return user.role === "admin" || (user.role === "teacher" && String(course.teacher) === String(user._id));
}

/**
 * US-08 substrate — POST /api/courses/:id/quizzes (Admin or the course's Teacher)
 * Quiz generation is manual for now (AI generation is a later, separate
 * story) — the teacher supplies title/duration/questions directly.
 */
const createQuiz = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, course);

  const { title, durationMinutes, questions } = req.body;

  if (!title || !durationMinutes) {
    res.status(400);
    throw new Error("Title and durationMinutes are required");
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400);
    throw new Error("At least one question is required");
  }

  const quiz = await Quiz.create({
    course: course._id,
    title,
    durationMinutes,
    createdBy: req.user._id,
  });

  try {
    await Question.insertMany(
      questions.map((q, i) => ({
        quiz: quiz._id,
        type: q.type === "subjective" ? "subjective" : "mcq",
        text: q.text,
        options: q.type === "subjective" ? undefined : q.options,
        correctOptionIndex: q.type === "subjective" ? undefined : q.correctOptionIndex,
        maxScore: q.type === "subjective" ? q.maxScore || 5 : 1,
        order: i,
        topic: q.topic || "",
      })),
      { ordered: true }
    );
  } catch (err) {
    // Standalone MongoDB (this project's local dev setup) doesn't support
    // multi-document transactions, so roll back manually on failure instead.
    await Quiz.deleteOne({ _id: quiz._id });
    res.status(400);
    throw new Error(`Invalid question data: ${err.message}`);
  }

  res.status(201).json({ success: true, data: quiz });
});

/**
 * GET /api/courses/:id/quizzes — role-scoped: Admin/owning Teacher see every
 * quiz (draft + published); an enrolled Student sees only published ones.
 */
const getQuizzesForCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const filter = { course: course._id };

  if (!isManagerOf(req.user, course)) {
    const enrolled = await Enrollment.exists({ student: req.user._id, course: course._id });
    if (!enrolled) {
      res.status(403);
      throw new Error("You are not enrolled in this course");
    }
    filter.isPublished = true;
  }

  const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: quizzes });
});

/**
 * GET /api/quizzes/:id — quiz + its questions. correctOptionIndex is only
 * ever included for the owning Teacher/Admin — never for a Student, who
 * could otherwise read the answer key straight out of the API response.
 */
const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error("Quiz not found");
  }
  const course = await Course.findById(quiz.course);
  const isManager = isManagerOf(req.user, course);

  if (!isManager) {
    const enrolled = await Enrollment.exists({ student: req.user._id, course: course._id });
    if (!enrolled) {
      res.status(403);
      throw new Error("You are not enrolled in this course");
    }
    if (!quiz.isPublished) {
      res.status(404); // don't reveal that a draft quiz exists to students
      throw new Error("Quiz not found");
    }
  }

  const questions = await Question.find({ quiz: quiz._id })
    .select(isManager ? "+correctOptionIndex" : "")
    .sort({ order: 1 });

  res.status(200).json({ success: true, data: { quiz, questions } });
});

/**
 * PUT /api/quizzes/:id/publish (Admin or the course's Teacher)
 */
const publishQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error("Quiz not found");
  }
  const course = await Course.findById(quiz.course);
  assertCourseManager(req.user, res, course);

  quiz.isPublished = req.body.isPublished !== undefined ? !!req.body.isPublished : !quiz.isPublished;
  await quiz.save();

  res.status(200).json({ success: true, data: quiz });
});

/**
 * US-08 — POST /api/quizzes/:id/attempts (Student only)
 * Idempotent start-or-resume: a fresh call creates the attempt; calling it
 * again just returns the same one (in progress or already submitted) so a
 * page refresh mid-quiz never loses or duplicates an attempt — the unique
 * (quiz, student) index is what makes this safe under a race.
 */
const startOrResumeAttempt = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error("Quiz not found");
  }
  const course = await Course.findById(quiz.course);
  const enrolled = await Enrollment.exists({ student: req.user._id, course: course._id });
  if (!enrolled) {
    res.status(403);
    throw new Error("You are not enrolled in this course");
  }
  if (!quiz.isPublished) {
    res.status(404);
    throw new Error("Quiz not found");
  }

  let attempt = await QuizAttempt.findOne({ quiz: quiz._id, student: req.user._id });
  if (!attempt) {
    attempt = await QuizAttempt.create({ quiz: quiz._id, student: req.user._id });
  }

  const answers = await Answer.find({ attempt: attempt._id });

  res.status(200).json({ success: true, data: { attempt, answers } });
});

/**
 * GET /api/quizzes/:id/attempts — results roster (Admin or owning Teacher).
 */
const getAttemptsForQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error("Quiz not found");
  }
  const course = await Course.findById(quiz.course);
  assertCourseManager(req.user, res, course);

  const attempts = await QuizAttempt.find({ quiz: quiz._id })
    .populate("student", "name email")
    .sort({ submittedAt: -1 });

  res.status(200).json({ success: true, data: attempts });
});

/**
 * US-05 — POST /api/courses/:id/quizzes/generate (Admin or the course's Teacher)
 * Drafts MCQ questions from an uploaded PDF via the configured AI provider
 * (AI_PROVIDER env var) and returns them WITHOUT saving anything — the
 * teacher reviews/edits the draft in the same question-builder UI used for
 * manual creation, and nothing exists until they call the existing
 * `createQuiz` endpoint. This keeps the teacher in control of quiz content,
 * in the same spirit as CLAUDE.md's HITL rule for grades.
 */
const generateQuizQuestions = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, course);

  const { materialId, numQuestions } = req.body;
  if (!materialId || !numQuestions || Number(numQuestions) < 1) {
    res.status(400);
    throw new Error("materialId and a positive numQuestions are required");
  }

  const material = await Material.findOne({ _id: materialId, course: course._id });
  if (!material) {
    res.status(404);
    throw new Error("Material not found in this course");
  }
  const filePath = path.join(MATERIALS_DIR, material.fileUrl);
  let text;
  try {
    text = await extractText(filePath, material.fileType);
  } catch (err) {
    res.status(400);
    throw new Error(`Could not extract text from this material: ${err.message}`);
  }
  if (!text || text.trim().length < 100) {
    res.status(400);
    throw new Error("Could not extract enough text from this material to generate a quiz");
  }
  const truncated = text.length > MAX_SOURCE_CHARS ? text.slice(0, MAX_SOURCE_CHARS) : text;

  const provider = getAIProvider();
  let result;
  try {
    result = await provider.generateQuiz({ text: truncated, numQuestions: Number(numQuestions) });
  } catch (err) {
    res.status(502);
    throw new Error(`AI quiz generation failed: ${err.message}`);
  }

  // Never trust external AI output blindly, even with JSON-schema
  // enforcement upstream — validate shape before it ever reaches the
  // question-builder UI or (later) the DB.
  const questions = (result.questions || [])
    .filter(
      (q) =>
        q &&
        typeof q.text === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
        Number.isInteger(q.correctOptionIndex) &&
        q.correctOptionIndex >= 0 &&
        q.correctOptionIndex <= 3
    )
    .map((q) => ({
      type: "mcq",
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      topic: typeof q.topic === "string" ? q.topic.trim().slice(0, 60) : "",
    }));

  if (questions.length === 0) {
    res.status(502);
    throw new Error("AI did not return any usable questions — try again");
  }

  res.status(200).json({ success: true, data: { questions } });
});

module.exports = {
  createQuiz,
  generateQuizQuestions,
  getQuizzesForCourse,
  getQuizById,
  publishQuiz,
  startOrResumeAttempt,
  getAttemptsForQuiz,
};
