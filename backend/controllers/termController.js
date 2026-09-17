const asyncHandler = require("express-async-handler");
const Term = require("../models/Term");

/**
 * POST /api/terms (Admin only)
 * The academic calendar anchor a CourseOffering belongs to. Marking a new
 * term isActive:true does NOT automatically flip any other term to false
 * — an admin explicitly manages which one is current, since a real
 * institution sometimes runs terms with overlapping windows (e.g. a
 * summer term alongside registration for the next fall).
 */
const createTerm = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, isActive } = req.body;

  if (!name || !startDate || !endDate) {
    res.status(400);
    throw new Error("name, startDate, and endDate are required");
  }

  const term = await Term.create({ name, startDate, endDate, isActive: !!isActive });
  res.status(201).json({ success: true, data: term });
});

/**
 * GET /api/terms — any authenticated role (needed by the offering-creation
 * dropdown, and harmless to read otherwise: a term name/date range isn't
 * sensitive).
 */
const getTerms = asyncHandler(async (req, res) => {
  const terms = await Term.find().sort({ startDate: -1 });
  res.status(200).json({ success: true, data: terms });
});

module.exports = { createTerm, getTerms };
