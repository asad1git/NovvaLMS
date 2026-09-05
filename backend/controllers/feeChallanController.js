const asyncHandler = require("express-async-handler");
const FeeChallan = require("../models/FeeChallan");
const User = require("../models/User");
const { generateFeeChallanPdf } = require("../services/pdfEngine");
const { notifyUsers } = require("../utils/notify");

function canAccess(user, challan) {
  // challan.student may be a populated User doc (has ._id) or a raw
  // ObjectId, depending on the caller — handle both.
  const studentId = challan.student._id || challan.student;
  return user.role === "admin" || String(studentId) === String(user._id);
}

/**
 * US-09 — POST /api/fee-challans (Admin only)
 */
const createFeeChallan = asyncHandler(async (req, res) => {
  const { studentId, amount, dueDate, description } = req.body;

  if (!studentId || !amount || !dueDate) {
    res.status(400);
    throw new Error("studentId, amount, and dueDate are required");
  }

  const student = await User.findOne({ _id: studentId, role: "student" });
  if (!student) {
    res.status(400);
    throw new Error("studentId must belong to an existing student account");
  }

  const count = await FeeChallan.countDocuments();
  const challanNumber = `CH-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const challan = await FeeChallan.create({
    student: student._id,
    challanNumber,
    amount,
    dueDate,
    description,
  });

  await notifyUsers([student._id], {
    type: "fee_challan_issued",
    title: `New fee challan issued: ${challanNumber}`,
    message: `A fee challan of Rs. ${amount} (due ${new Date(dueDate).toLocaleDateString()}) has been issued to your account.`,
  });

  res.status(201).json({ success: true, data: challan });
});

/**
 * GET /api/fee-challans — role-scoped: Admin sees all, a Student sees only their own.
 */
const getFeeChallans = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { student: req.user._id };
  const challans = await FeeChallan.find(filter).populate("student", "name email").sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: challans });
});

/**
 * PUT /api/fee-challans/:id/status (Admin only)
 */
const setFeeChallanStatus = asyncHandler(async (req, res) => {
  const challan = await FeeChallan.findById(req.params.id);
  if (!challan) {
    res.status(404);
    throw new Error("Fee challan not found");
  }
  challan.status = req.body.status === "paid" ? "paid" : "unpaid";
  await challan.save();
  res.status(200).json({ success: true, data: challan });
});

/**
 * GET /api/fee-challans/:id/pdf — Admin, or the owning Student.
 * Streamed through an authenticated route, not a static file — same
 * reasoning as Material downloads.
 */
const downloadFeeChallanPdf = asyncHandler(async (req, res) => {
  const challan = await FeeChallan.findById(req.params.id).populate("student", "name email");
  if (!challan) {
    res.status(404);
    throw new Error("Fee challan not found");
  }
  if (!canAccess(req.user, challan)) {
    res.status(403);
    throw new Error("You do not have access to this fee challan");
  }

  generateFeeChallanPdf(res, challan, challan.student);
});

module.exports = { createFeeChallan, getFeeChallans, setFeeChallanStatus, downloadFeeChallanPdf };
