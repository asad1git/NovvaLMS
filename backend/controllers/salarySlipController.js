const asyncHandler = require("express-async-handler");
const SalarySlip = require("../models/SalarySlip");
const User = require("../models/User");
const { generateSalarySlipPdf } = require("../services/pdfEngine");

function canAccess(user, slip) {
  // slip.employee may be a populated User doc (has ._id) or a raw
  // ObjectId, depending on the caller — handle both.
  const employeeId = slip.employee._id || slip.employee;
  return user.role === "admin" || String(employeeId) === String(user._id);
}

/**
 * US-10 — POST /api/salary-slips (Admin only)
 * "Employee" here means teacher or admin — students are never payroll.
 */
const createSalarySlip = asyncHandler(async (req, res) => {
  const { employeeId, month, basicSalary, allowances, deductions } = req.body;

  if (!employeeId || !month || basicSalary === undefined) {
    res.status(400);
    throw new Error("employeeId, month, and basicSalary are required");
  }

  const employee = await User.findOne({ _id: employeeId, role: { $in: ["teacher", "admin"] } });
  if (!employee) {
    res.status(400);
    throw new Error("employeeId must belong to an existing teacher or admin account");
  }

  const slip = await SalarySlip.create({
    employee: employee._id,
    month,
    basicSalary,
    allowances: allowances || 0,
    deductions: deductions || 0,
  });

  res.status(201).json({ success: true, data: slip });
});

/**
 * GET /api/salary-slips — role-scoped: Admin sees all, others see only their own.
 */
const getSalarySlips = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { employee: req.user._id };
  const slips = await SalarySlip.find(filter).populate("employee", "name email role").sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: slips });
});

/**
 * GET /api/salary-slips/:id/pdf — Admin, or the owning employee.
 */
const downloadSalarySlipPdf = asyncHandler(async (req, res) => {
  const slip = await SalarySlip.findById(req.params.id).populate("employee", "name email role");
  if (!slip) {
    res.status(404);
    throw new Error("Salary slip not found");
  }
  if (!canAccess(req.user, slip)) {
    res.status(403);
    throw new Error("You do not have access to this salary slip");
  }

  generateSalarySlipPdf(res, slip, slip.employee);
});

module.exports = { createSalarySlip, getSalarySlips, downloadSalarySlipPdf };
