const asyncHandler = require("express-async-handler");
const AdvisorLink = require("../models/AdvisorLink");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const CourseOffering = require("../models/CourseOffering");
const { computeTranscriptForStudent } = require("./transcriptController");
const { computeDegreeAudit } = require("./degreeAuditController");

/**
 * POST /api/advisor-links (Admin only) — same admin-managed join-collection
 * pattern as ParentLink.
 */
const linkAdvisor = asyncHandler(async (req, res) => {
  const { advisorId, studentId } = req.body;

  if (!advisorId || !studentId) {
    res.status(400);
    throw new Error("advisorId and studentId are required");
  }

  const [advisor, student] = await Promise.all([
    User.findOne({ _id: advisorId, role: "advisor" }),
    User.findOne({ _id: studentId, role: "student" }),
  ]);

  if (!advisor) {
    res.status(400);
    throw new Error("advisorId must belong to an existing advisor account");
  }
  if (!student) {
    res.status(400);
    throw new Error("studentId must belong to an existing student account");
  }

  try {
    const link = await AdvisorLink.create({ advisor: advisor._id, student: student._id });
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error("This advisor is already linked to this student");
    }
    throw err;
  }
});

/**
 * GET /api/advisor-links (Admin only) — full list, populated for display.
 */
const listAdvisorLinks = asyncHandler(async (req, res) => {
  const links = await AdvisorLink.find()
    .populate("advisor", "name email")
    .populate("student", "name email")
    .sort({ linkedAt: -1 });
  res.status(200).json({ success: true, data: links });
});

/**
 * DELETE /api/advisor-links/:id (Admin only)
 */
const unlinkAdvisor = asyncHandler(async (req, res) => {
  const link = await AdvisorLink.findById(req.params.id);
  if (!link) {
    res.status(404);
    throw new Error("Link not found");
  }
  await link.deleteOne();
  res.status(200).json({ success: true, data: { message: "Unlinked" } });
});

/**
 * GET /api/advisor-links/my-advisees (Advisor only)
 */
const getMyAdvisees = asyncHandler(async (req, res) => {
  const links = await AdvisorLink.find({ advisor: req.user._id }).populate("student", "name email");
  res.status(200).json({ success: true, data: links.map((l) => l.student) });
});

/**
 * GET /api/advisor-links/:studentId/transcript (Advisor only)
 * assertLinked (below) is the whole access-control boundary, exactly the
 * same shape as parentLinkController.getChildAnalytics — an advisor can
 * only ever see the transcript of a student they're explicitly linked to.
 */
const getAdviseeTranscript = asyncHandler(async (req, res) => {
  const linked = await AdvisorLink.exists({ advisor: req.user._id, student: req.params.studentId });
  if (!linked) {
    res.status(403);
    throw new Error("You are not linked to this student");
  }

  const data = await computeTranscriptForStudent(req.params.studentId);
  res.status(200).json({ success: true, data });
});

/**
 * GET /api/advisor-links/:studentId/registration (Advisor only)
 * The "registration" half of item 5's "sees a specific set of students'
 * registration and degree progress" — every CourseOffering this advisee is
 * currently enrolled in. "Degree progress" is covered by the transcript
 * endpoint above; a full degree-audit (roadmap item 8) doesn't exist yet.
 */
const getAdviseeRegistration = asyncHandler(async (req, res) => {
  const linked = await AdvisorLink.exists({ advisor: req.user._id, student: req.params.studentId });
  if (!linked) {
    res.status(403);
    throw new Error("You are not linked to this student");
  }

  const offeringIds = (await Enrollment.find({ student: req.params.studentId }).select("courseOffering")).map(
    (e) => e.courseOffering
  );
  const offerings = await CourseOffering.find({ _id: { $in: offeringIds } })
    .populate("course", "title code creditHours")
    .populate("teacher", "name email")
    .populate("term", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: offerings.map((o) => ({
      _id: o._id,
      courseTitle: o.course.title,
      courseCode: o.course.code,
      creditHours: o.course.creditHours,
      teacherName: o.teacher.name,
      termName: o.term.name,
      sectionLabel: o.sectionLabel,
    })),
  });
});

/**
 * GET /api/advisor-links/:studentId/degree-audit (Advisor only)
 * Completes what item 5's own writeup flagged as deferred — "degree
 * progress" only had the transcript to point to since no degree audit
 * existed yet. Now it does, so an advisor gets the real thing.
 */
const getAdviseeDegreeAudit = asyncHandler(async (req, res) => {
  const linked = await AdvisorLink.exists({ advisor: req.user._id, student: req.params.studentId });
  if (!linked) {
    res.status(403);
    throw new Error("You are not linked to this student");
  }

  const data = await computeDegreeAudit(req.params.studentId);
  res.status(200).json({ success: true, data });
});

module.exports = {
  linkAdvisor,
  listAdvisorLinks,
  unlinkAdvisor,
  getMyAdvisees,
  getAdviseeTranscript,
  getAdviseeRegistration,
  getAdviseeDegreeAudit,
};
