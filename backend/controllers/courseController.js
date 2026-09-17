const asyncHandler = require("express-async-handler");
const { parse } = require("csv-parse/sync");
const Course = require("../models/Course");
const CourseOffering = require("../models/CourseOffering");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");
const { flattenOffering } = require("./offeringController");

/**
 * POST /api/courses (Admin only)
 * Creates a catalog entry ONLY — no teacher, no term. A course now exists
 * in the catalog independent of who teaches it or when; assigning a
 * teacher+term is the separate POST /api/offerings step.
 */
const createCourse = asyncHandler(async (req, res) => {
  const { title, code, description } = req.body;

  if (!title || !code) {
    res.status(400);
    throw new Error("Title and code are required");
  }

  const course = await Course.create({ title, code: code.toUpperCase(), description });
  res.status(201).json({ success: true, data: course });
});

/**
 * GET /api/courses/catalog (Admin only) — the plain catalog, used by the
 * offering-creation dropdown ("which catalog course is this an offering
 * of"). Deliberately a different path from GET /api/courses below, which
 * returns role-scoped OFFERINGS, not catalog entries — the two are not
 * interchangeable.
 */
const listCatalogCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ code: 1 });
  res.status(200).json({ success: true, data: courses });
});

/**
 * GET /api/courses
 * Role-scoped, exactly as before this pass: an Admin sees every offering,
 * a Teacher sees only the offerings they teach, a Student sees only
 * offerings they're enrolled in — just backed by CourseOffering now
 * instead of Course directly, flattened back into the same shape every
 * existing frontend caller already expects (see flattenOffering's own
 * comment for why).
 */
const getCourses = asyncHandler(async (req, res) => {
  let offerings;

  if (req.user.role === "admin") {
    offerings = await CourseOffering.find()
      .populate("course", "title code description")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });
  } else if (req.user.role === "teacher") {
    offerings = await CourseOffering.find({ teacher: req.user._id })
      .populate("course", "title code description")
      .sort({ createdAt: -1 });
  } else {
    const offeringIds = (await Enrollment.find({ student: req.user._id }).select("courseOffering")).map(
      (e) => e.courseOffering
    );
    offerings = await CourseOffering.find({ _id: { $in: offeringIds } })
      .populate("course", "title code description")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });
  }

  res.status(200).json({ success: true, data: offerings.map(flattenOffering) });
});

/**
 * GET /api/courses/:id — :id is a CourseOffering id (see courseAccess.js).
 */
const getCourseById = asyncHandler(async (req, res) => {
  const offering = await assertCourseAccess(req.user, res, req.params.id);
  res.status(200).json({ success: true, data: flattenOffering(offering) });
});

/**
 * US-03 — POST /api/courses/:id/enroll/csv (Admin only)
 * :id is a CourseOffering id — enrollment is inherently offering-level
 * (a real registration is into a specific section/term, not "the
 * course" in the abstract). The CSV must have an "email" column. This
 * enrolls existing Student accounts only — it never creates accounts
 * (that's US-01, via POST /api/users).
 */
const bulkEnrollFromCSV = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) {
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
      await Enrollment.create({ student: student._id, courseOffering: offering._id });
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
 * GET /api/courses/:id/enrollments — class roster. :id is a CourseOffering
 * id. Deliberately admin/owning-teacher only (assertCourseManager, not
 * assertCourseAccess) — a Student must never see their classmates' info.
 */
const getEnrollments = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, offering);

  const enrollments = await Enrollment.find({ courseOffering: offering._id })
    .populate("student", "name email")
    .sort({ enrolledAt: -1 });

  res.status(200).json({ success: true, data: enrollments });
});

module.exports = {
  createCourse,
  listCatalogCourses,
  getCourses,
  getCourseById,
  bulkEnrollFromCSV,
  getEnrollments,
};
