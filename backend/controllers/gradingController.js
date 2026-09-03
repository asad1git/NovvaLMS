const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const { assertCourseManager } = require("../utils/courseAccess");
const { recomputeAttemptScore } = require("../utils/scoring");

/**
 * HITL — GET /api/grading/pending (Admin, or Teacher scoped to their own courses)
 * There's no denormalized course/teacher reference on Answer, so this walks
 * courses -> quizzes -> subjective questions -> pending answers. Fine at
 * this project's scale; not worth an aggregation pipeline for it.
 */
const getPendingGrades = asyncHandler(async (req, res) => {
  const courseFilter = req.user.role === "teacher" ? { teacher: req.user._id } : {};

  const courses = await Course.find(courseFilter).select("_id title code");
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  const quizzes = await Quiz.find({ course: { $in: [...courseById.keys()] } }).select("_id title course");
  const quizById = new Map(quizzes.map((q) => [String(q._id), q]));

  const questions = await Question.find({
    quiz: { $in: [...quizById.keys()] },
    type: "subjective",
  }).select("_id text maxScore quiz");
  const questionById = new Map(questions.map((q) => [String(q._id), q]));

  const pendingAnswers = await Answer.find({
    question: { $in: [...questionById.keys()] },
    gradeStatus: "pending",
  })
    .populate({ path: "attempt", populate: { path: "student", select: "name email" } })
    .sort({ _id: 1 });

  const data = pendingAnswers.map((a) => {
    const question = questionById.get(String(a.question));
    const quiz = quizById.get(String(question.quiz));
    const course = courseById.get(String(quiz.course));
    return {
      _id: a._id,
      textAnswer: a.textAnswer,
      questionText: question.text,
      maxScore: question.maxScore,
      quizTitle: quiz.title,
      courseCode: course.code,
      studentName: a.attempt.student.name,
      studentEmail: a.attempt.student.email,
      aiDraftScore: a.aiDraftScore,
      aiDraftJustification: a.aiDraftJustification,
    };
  });

  res.status(200).json({ success: true, data });
});

/**
 * HITL — PUT /api/grading/:id (Admin or the course's Teacher)
 * This is the approve/override step: the frontend pre-fills score/feedback
 * from aiDraftScore/aiDraftJustification (see getPendingGrades), but
 * whatever the Teacher actually submits here — accepted as-is or edited —
 * becomes the one and only final grade. The AI's draft never counts on
 * its own, no matter how confident it was.
 */
const gradeAnswer = asyncHandler(async (req, res) => {
  const answer = await Answer.findById(req.params.id);
  if (!answer) {
    res.status(404);
    throw new Error("Answer not found");
  }

  const question = await Question.findById(answer.question);
  if (!question || question.type !== "subjective") {
    res.status(400);
    throw new Error("Only subjective answers can be graded manually");
  }

  const quiz = await Quiz.findById(question.quiz);
  const course = await Course.findById(quiz.course);
  assertCourseManager(req.user, res, course);

  const { score, feedback } = req.body;
  if (score === undefined || score === null || score < 0 || score > question.maxScore) {
    res.status(400);
    throw new Error(`Score must be between 0 and ${question.maxScore}`);
  }

  answer.score = score;
  answer.feedback = feedback || "";
  answer.gradeStatus = "graded";
  answer.gradedBy = req.user._id;
  answer.gradedAt = new Date();
  await answer.save();

  await recomputeAttemptScore(answer.attempt);

  res.status(200).json({ success: true, data: answer });
});

module.exports = { getPendingGrades, gradeAnswer };
