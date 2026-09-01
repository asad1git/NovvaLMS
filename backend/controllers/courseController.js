const asyncHandler = require("express-async-handler");
const { parse } = require("csv-parse/sync");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");

/**
 * US-03 — POST /api/courses (Admin only)
 */
const createCourse = asyncHandler(async (req, res) => {
  const { title, code, description, teacherId } = req.body;

  if (!title || !code || !teacherId) {
    res.status(400);
    throw new Error("Title, code, and teacherId are required");
  }

  const teacher = await User.findOne({ _id: teacherId, role: "teacher" });
  if (!teacher) {
    res.status(400);
    throw new Error("teacherId must belong to an existing teacher account");
  }

  const course = await Course.create({
    title,
    code: code.toUpperCase(),
    description,
    teacher: teacher._id,
  });

  res.status(201).json({ success: true, data: course });
});

/**
 * GET /api/courses
 * Role-scoped: an Admin sees every course, a Teacher sees only the courses
 * they teach, a Student sees only courses they're enrolled in.
 */
const getCourses = asyncHandler(async (req, res) => {
  let courses;

  if (req.user.role === "admin") {
    courses = await Course.find().populate("teacher", "name email").sort({ createdAt: -1 });
  } else if (req.user.role === "teacher") {
    courses = await Course.find({ teacher: req.user._id }).sort({ createdAt: -1 });
  } else {
    const courseIds = (await Enrollment.find({ student: req.user._id }).select("course")).map(
      (e) => e.course
    );
    courses = await Course.find({ _id: { $in: courseIds } })
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });
  }

  res.status(200).json({ success: true, data: courses });
});

/**
 * GET /api/courses/:id
 */
const getCourseById = asyncHandler(async (req, res) => {
  const course = await assertCourseAccess(req.user, res, req.params.id);
  res.status(200).json({ success: true, data: course });
});

/**
 * US-03 — POST /api/courses/:id/enroll/csv (Admin only)
 * The CSV must have an "email" column. This enrolls existing Student
 * accounts only — it never creates accounts (that's US-01, via POST /api/users).
 */
const bulkEnrollFromCSV = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("A CSV file is required (field name: file)");
  }

  let rows;
  try {
    rows = parse(req.file.buffer.toString("utf-8"), {
      columns: (header) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    res.status(400);
    throw new Error(`Could not parse CSV file: ${err.message}`);
  }

  const enrolled = [];
  const skipped = [];
  const notFound = [];

  for (const row of rows) {
    const email = (row.email || "").toLowerCase().trim();
    if (!email) continue;

    const student = await User.findOne({ email, role: "student" });
    if (!student) {
      notFound.push(email);
      continue;
    }

    try {
      await Enrollment.create({ student: student._id, course: course._id });
      enrolled.push(email);
    } catch (err) {
      if (err.code === 11000) {
        skipped.push(email); // already enrolled
      } else {
        throw err;
      }
    }
  }

  res.status(200).json({ success: true, data: { enrolled, skipped, notFound } });
});

/**
 * GET /api/courses/:id/enrollments — class roster.
 * Deliberately admin/owning-teacher only (assertCourseManager, not
 * assertCourseAccess) — a Student must never see their classmates' info.
 */
const getEnrollments = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, course);

  const enrollments = await Enrollment.find({ course: course._id })
    .populate("student", "name email")
    .sort({ enrolledAt: -1 });

  res.status(200).json({ success: true, data: enrollments });
});

module.exports = { createCourse, getCourses, getCourseById, bulkEnrollFromCSV, getEnrollments };
