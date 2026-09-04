const asyncHandler = require("express-async-handler");
const ParentLink = require("../models/ParentLink");
const User = require("../models/User");
const { computeAnalyticsForStudent } = require("./analyticsController");

/**
 * POST /api/parent-links (Admin only)
 * Links a parent account to a student account so the parent can view that
 * child's progress. Admin-managed, consistent with every other account
 * relationship in this app (Enrollment is the same shape for student+course).
 */
const linkParent = asyncHandler(async (req, res) => {
  const { parentId, studentId } = req.body;

  if (!parentId || !studentId) {
    res.status(400);
    throw new Error("parentId and studentId are required");
  }

  const [parent, student] = await Promise.all([
    User.findOne({ _id: parentId, role: "parent" }),
    User.findOne({ _id: studentId, role: "student" }),
  ]);

  if (!parent) {
    res.status(400);
    throw new Error("parentId must belong to an existing parent account");
  }
  if (!student) {
    res.status(400);
    throw new Error("studentId must belong to an existing student account");
  }

  try {
    const link = await ParentLink.create({ parent: parent._id, student: student._id });
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error("This parent is already linked to this student");
    }
    throw err;
  }
});

/**
 * GET /api/parent-links (Admin only) — full list, populated for display.
 */
const listParentLinks = asyncHandler(async (req, res) => {
  const links = await ParentLink.find()
    .populate("parent", "name email")
    .populate("student", "name email")
    .sort({ linkedAt: -1 });
  res.status(200).json({ success: true, data: links });
});

/**
 * DELETE /api/parent-links/:id (Admin only)
 */
const unlinkParent = asyncHandler(async (req, res) => {
  const link = await ParentLink.findById(req.params.id);
  if (!link) {
    res.status(404);
    throw new Error("Link not found");
  }
  await link.deleteOne();
  res.status(200).json({ success: true, data: { message: "Unlinked" } });
});

/**
 * GET /api/parent-links/my-children (Parent only)
 * Returns the students linked to the logged-in parent, for the parent
 * dashboard's child picker.
 */
const getMyChildren = asyncHandler(async (req, res) => {
  const links = await ParentLink.find({ parent: req.user._id }).populate("student", "name email");
  res.status(200).json({ success: true, data: links.map((l) => l.student) });
});

/**
 * GET /api/parent-links/:studentId/analytics (Parent only)
 * Phase 2 of the parent portal — the same US-11 aggregation a student sees
 * about themselves, reused here for a linked child. `assertLinked` is the
 * whole access-control boundary: a parent can only ever see analytics for a
 * student they're explicitly linked to via ParentLink, never any other
 * student — checked before the aggregation runs, not left to the frontend.
 */
const getChildAnalytics = asyncHandler(async (req, res) => {
  const linked = await ParentLink.exists({ parent: req.user._id, student: req.params.studentId });
  if (!linked) {
    res.status(403);
    throw new Error("You are not linked to this student");
  }

  const data = await computeAnalyticsForStudent(req.params.studentId);
  res.status(200).json({ success: true, data });
});

module.exports = { linkParent, listParentLinks, unlinkParent, getMyChildren, getChildAnalytics };
