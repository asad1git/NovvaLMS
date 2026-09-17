const asyncHandler = require("express-async-handler");
const FeeChallan = require("../models/FeeChallan");
const FeeStructure = require("../models/FeeStructure");
const CourseOffering = require("../models/CourseOffering");
const Enrollment = require("../models/Enrollment");
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

/**
 * POST /api/fee-challans/structures (Admin only)
 * Upsert — one FeeStructure per Term, so re-submitting the form for the
 * same term updates the existing rate rather than creating a duplicate.
 */
const setFeeStructure = asyncHandler(async (req, res) => {
  const { termId, perCreditHourRate, fixedFees } = req.body;

  if (!termId || perCreditHourRate === undefined || perCreditHourRate === null) {
    res.status(400);
    throw new Error("termId and perCreditHourRate are required");
  }

  const structure = await FeeStructure.findOneAndUpdate(
    { term: termId },
    { term: termId, perCreditHourRate: Number(perCreditHourRate), fixedFees: fixedFees ? Number(fixedFees) : 0 },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: structure });
});

/**
 * GET /api/fee-challans/structures (Admin only)
 */
const getFeeStructures = asyncHandler(async (req, res) => {
  const structures = await FeeStructure.find().populate("term", "name").sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: structures });
});

/**
 * POST /api/fee-challans/generate (Admin only)
 * Bulk-generates a FeeChallan for every student enrolled in at least one
 * CourseOffering of the given term, with the amount computed from that
 * term's FeeStructure and the student's total registered credit-hour load
 * — reusing the existing FeeChallan model/PDF pipeline unchanged. A student
 * who already has a challan for this term is skipped, so re-running after
 * a new registration only bills the newly-registered students, and the
 * manual "Create Fee Challan" flow (no term set) is left alone entirely.
 */
const generateChallansForTerm = asyncHandler(async (req, res) => {
  const { termId, dueDate, description } = req.body;

  if (!termId || !dueDate) {
    res.status(400);
    throw new Error("termId and dueDate are required");
  }

  const structure = await FeeStructure.findOne({ term: termId }).populate("term", "name");
  if (!structure) {
    res.status(400);
    throw new Error("No fee structure has been set for this term yet");
  }

  const offerings = await CourseOffering.find({ term: termId }).populate("course", "creditHours");
  const offeringIds = offerings.map((o) => o._id);
  const creditHoursByOffering = new Map(offerings.map((o) => [String(o._id), o.course.creditHours]));

  const enrollments = await Enrollment.find({ courseOffering: { $in: offeringIds } }).populate("student", "name email");

  const creditHoursByStudent = new Map(); // studentId -> { student, creditHours }
  for (const enr of enrollments) {
    const studentId = String(enr.student._id);
    const creditHours = creditHoursByOffering.get(String(enr.courseOffering)) || 0;
    const existing = creditHoursByStudent.get(studentId);
    if (existing) {
      existing.creditHours += creditHours;
    } else {
      creditHoursByStudent.set(studentId, { student: enr.student, creditHours });
    }
  }

  const generated = [];
  const skipped = [];
  let challanCount = await FeeChallan.countDocuments();

  for (const { student, creditHours } of creditHoursByStudent.values()) {
    const alreadyBilled = await FeeChallan.exists({ student: student._id, term: termId });
    if (alreadyBilled) {
      skipped.push({ studentId: student._id, name: student.name, reason: "Already billed for this term" });
      continue;
    }

    const amount = creditHours * structure.perCreditHourRate + structure.fixedFees;
    challanCount += 1;
    const challanNumber = `CH-${new Date().getFullYear()}-${String(challanCount).padStart(4, "0")}`;

    const challan = await FeeChallan.create({
      student: student._id,
      term: termId,
      challanNumber,
      amount,
      dueDate,
      description: description || `Tuition Fee — ${structure.term.name}`,
    });

    await notifyUsers([student._id], {
      type: "fee_challan_issued",
      title: `New fee challan issued: ${challanNumber}`,
      message: `A fee challan of Rs. ${amount} (due ${new Date(dueDate).toLocaleDateString()}) has been issued to your account.`,
    });

    generated.push({ studentId: student._id, name: student.name, amount, challanNumber });
  }

  res.status(200).json({ success: true, data: { generated, skipped } });
});

module.exports = {
  createFeeChallan,
  getFeeChallans,
  setFeeChallanStatus,
  downloadFeeChallanPdf,
  setFeeStructure,
  getFeeStructures,
  generateChallansForTerm,
};
