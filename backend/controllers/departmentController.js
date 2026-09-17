const asyncHandler = require("express-async-handler");
const Department = require("../models/Department");
const Course = require("../models/Course");
const CourseOffering = require("../models/CourseOffering");
const Enrollment = require("../models/Enrollment");
const Grade = require("../models/Grade");

/**
 * POST /api/departments (Admin only)
 */
const createDepartment = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    res.status(400);
    throw new Error("Name and code are required");
  }

  const department = await Department.create({ name, code: code.toUpperCase() });
  res.status(201).json({ success: true, data: department });
});

/**
 * GET /api/departments (Admin, Registrar, HOD)
 * Registrar needs this to populate the "which department" dropdown when
 * creating a catalog course; an HOD just sees the list a department report
 * can be requested for.
 */
const listDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.status(200).json({ success: true, data: departments });
});

/**
 * GET /api/departments/:id/report (Admin, or the HOD heading THIS
 * department only — never another department's). Returns every catalog
 * course in the department, every CourseOffering of those courses (any
 * term), each offering's enrollment, and a department-wide average of
 * every finalized Grade in it — the "department-level reporting" from the
 * roadmap doc's item 5, reusing the existing Grade model rather than
 * inventing a parallel aggregation.
 */
const getDepartmentReport = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    res.status(404);
    throw new Error("Department not found");
  }

  if (req.user.role === "hod" && String(req.user.department) !== String(department._id)) {
    res.status(403);
    throw new Error("You can only view your own department's report");
  }

  const courses = await Course.find({ department: department._id }).sort({ code: 1 });
  const courseIds = courses.map((c) => c._id);

  const offerings = await CourseOffering.find({ course: { $in: courseIds } })
    .populate("course", "title code creditHours")
    .populate("teacher", "name email")
    .populate("term", "name")
    .sort({ createdAt: -1 });

  const enrollmentCounts = await Enrollment.aggregate([
    { $match: { courseOffering: { $in: offerings.map((o) => o._id) } } },
    { $group: { _id: "$courseOffering", count: { $sum: 1 } } },
  ]);
  const enrollmentByOffering = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

  const grades = await Grade.find({ courseOffering: { $in: offerings.map((o) => o._id) } });
  const averagePercentage =
    grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + g.finalPercentage, 0) / grades.length) * 10) / 10
      : null;

  res.status(200).json({
    success: true,
    data: {
      department,
      courses,
      offerings: offerings.map((o) => ({
        _id: o._id,
        courseTitle: o.course.title,
        courseCode: o.course.code,
        creditHours: o.course.creditHours,
        teacherName: o.teacher.name,
        termName: o.term.name,
        sectionLabel: o.sectionLabel,
        enrolledCount: enrollmentByOffering.get(String(o._id)) || 0,
        capacity: o.capacity,
      })),
      averagePercentage,
      gradedCount: grades.length,
    },
  });
});

module.exports = { createDepartment, listDepartments, getDepartmentReport };
