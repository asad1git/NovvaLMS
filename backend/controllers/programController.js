const asyncHandler = require("express-async-handler");
const Program = require("../models/Program");

/**
 * POST /api/programs (Admin only)
 */
const createProgram = asyncHandler(async (req, res) => {
  const { name, code, requiredCourses, totalCreditHoursRequired, minGpaToGraduate } = req.body;

  if (!name || !code || !totalCreditHoursRequired) {
    res.status(400);
    throw new Error("name, code, and totalCreditHoursRequired are required");
  }

  const program = await Program.create({
    name,
    code: code.toUpperCase(),
    requiredCourses: requiredCourses || [],
    totalCreditHoursRequired: Number(totalCreditHoursRequired),
    minGpaToGraduate: minGpaToGraduate !== undefined ? Number(minGpaToGraduate) : undefined,
  });
  res.status(201).json({ success: true, data: program });
});

/**
 * GET /api/programs (Admin only) — used both for the program-management
 * list and to populate the "assign a program to this student" dropdown in
 * Manage Users.
 */
const listPrograms = asyncHandler(async (req, res) => {
  const programs = await Program.find().populate("requiredCourses", "title code creditHours").sort({ name: 1 });
  res.status(200).json({ success: true, data: programs });
});

module.exports = { createProgram, listPrograms };
