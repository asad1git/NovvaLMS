const asyncHandler = require("express-async-handler");
const CourseOffering = require("../models/CourseOffering");
const Enrollment = require("../models/Enrollment");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Grade = require("../models/Grade");
const { assertCourseManager } = require("../utils/courseAccess");
const { percentageToGrade } = require("../utils/gradeScale");

/**
 * Aggregates every fully-settled quiz attempt and graded assignment
 * submission this student has in this offering into one earned/possible
 * points total. Deliberately excludes anything not yet fully resolved —
 * a quiz attempt still awaiting HITL subjective grading
 * (`gradingComplete: false`) or an assignment submission still
 * `gradeStatus: "pending"` — so a computed percentage never reflects a
 * grade that could still change. Returns `{ percentage: null, ... }` when
 * nothing gradable exists yet, since "no grade yet" and "0%" are not the
 * same thing.
 */
async function computeOfferingPercentage(studentId, offeringId) {
  const quizzes = await Quiz.find({ courseOffering: offeringId }).select("_id");
  const attempts = await QuizAttempt.find({
    quiz: { $in: quizzes.map((q) => q._id) },
    student: studentId,
    submittedAt: { $ne: null },
    gradingComplete: true,
  }).select("score maxScore");

  const assignments = await Assignment.find({ courseOffering: offeringId }).select("_id maxScore");
  const maxScoreByAssignment = new Map(assignments.map((a) => [String(a._id), a.maxScore]));
  const submissions = await AssignmentSubmission.find({
    assignment: { $in: assignments.map((a) => a._id) },
    student: studentId,
    gradeStatus: "graded",
  }).select("assignment score");

  let earned = 0;
  let possible = 0;
  for (const a of attempts) {
    earned += a.score || 0;
    possible += a.maxScore || 0;
  }
  for (const s of submissions) {
    earned += s.score || 0;
    possible += maxScoreByAssignment.get(String(s.assignment)) || 0;
  }

  if (possible === 0) return { percentage: null, earned: 0, possible: 0 };
  return { percentage: Math.round((earned / possible) * 1000) / 10, earned, possible };
}

/**
 * GET /api/courses/:id/grades (Admin or the course's Teacher) — :id is a
 * CourseOffering id. For every enrolled student: the system-computed
 * draft (percentage + letter, from every fully-settled quiz/assignment
 * so far) alongside whatever's already been finalized, if anything.
 * Deliberately manager-only, same as the enrollment roster — a Student
 * must never see a classmate's grade, draft or final.
 */
const getOfferingGrades = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, offering);

  const [enrollments, existingGrades] = await Promise.all([
    Enrollment.find({ courseOffering: offering._id }).populate("student", "name email"),
    Grade.find({ courseOffering: offering._id }),
  ]);
  const gradeByStudent = new Map(existingGrades.map((g) => [String(g.student), g]));

  const data = await Promise.all(
    enrollments.map(async (e) => {
      const { percentage } = await computeOfferingPercentage(e.student._id, offering._id);
      const computed = percentageToGrade(percentage);
      const existing = gradeByStudent.get(String(e.student._id));
      return {
        student: e.student,
        computedPercentage: percentage,
        computedLetter: computed?.letter || null,
        finalLetter: existing?.finalLetter || null,
        finalPercentage: existing?.finalPercentage ?? null,
        finalizedAt: existing?.finalizedAt || null,
      };
    })
  );

  res.status(200).json({ success: true, data });
});

/**
 * PUT /api/courses/:id/grades/:studentId (Admin or the course's Teacher)
 * HITL finalize/override step, same shape as gradingController.gradeAnswer:
 * the frontend pre-fills from the computed draft, but whatever percentage
 * the Teacher actually submits here — accepted as-is or overridden —
 * becomes the one and only grade a transcript ever reads. Re-finalizing
 * (a grade change) updates the same Grade document rather than creating
 * a second one.
 */
const finalizeGrade = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, offering);

  const enrolled = await Enrollment.exists({ student: req.params.studentId, courseOffering: offering._id });
  if (!enrolled) {
    res.status(400);
    throw new Error("That student is not enrolled in this course");
  }

  const { percentage } = req.body;
  if (percentage === undefined || percentage === null || percentage < 0 || percentage > 100) {
    res.status(400);
    throw new Error("percentage must be between 0 and 100");
  }

  const grade = percentageToGrade(percentage);

  const updated = await Grade.findOneAndUpdate(
    { student: req.params.studentId, courseOffering: offering._id },
    {
      finalPercentage: percentage,
      finalLetter: grade.letter,
      finalPoints: grade.points,
      finalizedBy: req.user._id,
      finalizedAt: new Date(),
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: updated });
});

/**
 * Every finalized grade a student has, grouped by term, with a
 * credit-hour-weighted GPA per term and cumulative across all terms.
 * Deliberately reads ONLY finalized Grade documents — never the computed
 * draft — same HITL boundary as everywhere else in this project: a
 * student (or their advisor) sees the teacher's decision, not the
 * system's guess. Factored out of getMyTranscript so advisorLinkController
 * can reuse the exact same aggregation for a linked advisee, the same
 * split pattern computeAnalyticsForStudent uses for the parent portal.
 */
async function computeTranscriptForStudent(studentId) {
  const grades = await Grade.find({ student: studentId })
    .populate({
      path: "courseOffering",
      populate: [
        { path: "course", select: "title code creditHours" },
        { path: "term", select: "name startDate endDate" },
      ],
    })
    .sort({ finalizedAt: 1 });

  const termMap = new Map(); // term._id -> { term, courses: [], totalPoints, totalCredits }

  for (const g of grades) {
    const offering = g.courseOffering;
    if (!offering || !offering.term || !offering.course) continue; // defensive — offering/course/term deleted after grading

    const termId = String(offering.term._id);
    if (!termMap.has(termId)) {
      termMap.set(termId, { term: offering.term, courses: [], totalPoints: 0, totalCredits: 0 });
    }
    const bucket = termMap.get(termId);
    const creditHours = offering.course.creditHours;

    bucket.courses.push({
      code: offering.course.code,
      title: offering.course.title,
      creditHours,
      finalLetter: g.finalLetter,
      finalPercentage: g.finalPercentage,
    });
    bucket.totalPoints += g.finalPoints * creditHours;
    bucket.totalCredits += creditHours;
  }

  const terms = Array.from(termMap.values())
    .map((b) => ({
      term: b.term,
      courses: b.courses,
      termGpa: b.totalCredits > 0 ? Math.round((b.totalPoints / b.totalCredits) * 100) / 100 : null,
      termCredits: b.totalCredits,
    }))
    .sort((a, b) => new Date(a.term.startDate) - new Date(b.term.startDate));

  const cumulativeCredits = terms.reduce((sum, t) => sum + t.termCredits, 0);
  const cumulativePoints = terms.reduce(
    (sum, t) => sum + (t.termGpa !== null ? t.termGpa * t.termCredits : 0),
    0
  );

  return {
    terms,
    cumulativeGpa: cumulativeCredits > 0 ? Math.round((cumulativePoints / cumulativeCredits) * 100) / 100 : null,
    cumulativeCredits,
  };
}

/**
 * GET /api/transcript/me (Student only) — thin wrapper around
 * computeTranscriptForStudent for the logged-in student themselves.
 */
const getMyTranscript = asyncHandler(async (req, res) => {
  const data = await computeTranscriptForStudent(req.user._id);
  res.status(200).json({ success: true, data });
});

module.exports = {
  computeOfferingPercentage,
  computeTranscriptForStudent,
  getOfferingGrades,
  finalizeGrade,
  getMyTranscript,
};
