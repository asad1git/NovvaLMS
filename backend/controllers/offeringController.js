const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Term = require("../models/Term");
const CourseOffering = require("../models/CourseOffering");
const User = require("../models/User");

/**
 * Flattens a populated CourseOffering into the same shape the old, pre-split
 * `Course` object had (`_id`, `title`, `code`, `description`, `teacher`) —
 * plus the new `term`/`sectionLabel` fields. This is deliberate: every
 * existing frontend page that reads `course.title`/`course.code`/
 * `course.teacher` off what `listCourses()` returns keeps working
 * completely unchanged, since `_id` here is the offering's own id (the
 * same id every sub-resource — materials, quizzes, assignments,
 * attendance, chat — already expects). Only `AdminCourses.jsx`, which
 * manages the catalog/term/offering split directly, needs to know about
 * the underlying structure.
 */
function flattenOffering(offering) {
  return {
    _id: offering._id,
    title: offering.course?.title,
    code: offering.course?.code,
    description: offering.course?.description,
    teacher: offering.teacher,
    term: offering.term,
    sectionLabel: offering.sectionLabel,
    capacity: offering.capacity,
    enrolledCount: offering.enrolledCount,
    seatsRemaining: offering.capacity - offering.enrolledCount,
    isActive: offering.isActive,
    createdAt: offering.createdAt,
  };
}

/**
 * POST /api/offerings (Admin only)
 * Assigns a catalog Course to a Term with a Teacher — this is the actual
 * "who teaches what, when" fact a real timetable/roster hangs off.
 */
const createOffering = asyncHandler(async (req, res) => {
  const { courseId, termId, teacherId, sectionLabel, capacity } = req.body;

  if (!courseId || !termId || !teacherId) {
    res.status(400);
    throw new Error("courseId, termId, and teacherId are required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    res.status(400);
    throw new Error("courseId must belong to an existing catalog course");
  }

  const term = await Term.findById(termId);
  if (!term) {
    res.status(400);
    throw new Error("termId must belong to an existing term");
  }

  const teacher = await User.findOne({ _id: teacherId, role: "teacher" });
  if (!teacher) {
    res.status(400);
    throw new Error("teacherId must belong to an existing teacher account");
  }

  let offering;
  try {
    offering = await CourseOffering.create({
      course: course._id,
      term: term._id,
      teacher: teacher._id,
      sectionLabel: sectionLabel || "A",
      capacity: capacity ? Number(capacity) : undefined,
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error("This course already has an offering with that section label in this term");
    }
    throw err;
  }

  offering = await CourseOffering.findById(offering._id).populate("course", "title code description").populate("teacher", "name email");

  res.status(201).json({ success: true, data: flattenOffering(offering) });
});

module.exports = { createOffering, flattenOffering };
