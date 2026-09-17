const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Grade = require("../models/Grade");
const { computeTranscriptForStudent } = require("./transcriptController");

// Fixed academic-standing bands — the roadmap doc's "probation/suspension
// thresholds based on GPA," not a per-program setting (unlike
// Program.minGpaToGraduate, which IS per-program). 2.0/1.0 are the
// standard bands most real universities use; not configurable here,
// consistent with this item's "simplified version, not full generality"
// scoping.
function computeAcademicStanding(cumulativeGpa) {
  if (cumulativeGpa === null) return "Good Standing"; // no finalized grades yet — nothing to flag
  if (cumulativeGpa < 1.0) return "Academic Suspension";
  if (cumulativeGpa < 2.0) return "Academic Probation";
  return "Good Standing";
}

/**
 * The simplified degree audit this roadmap item scoped to: does this
 * student's Program have a FIXED list of required courses, and has the
 * student passed each one (in any term/offering, same "passing = finalLetter
 * !== 'F'" rule registrationController.getUnmetPrerequisites already uses)?
 * Deliberately does NOT model elective categories, transfer credit, or a
 * minimum-grade-per-course rule — real SIS products spend years on that
 * generality, and it wasn't asked for here.
 */
async function computeDegreeAudit(studentId) {
  const student = await User.findById(studentId).populate({
    path: "program",
    populate: { path: "requiredCourses", select: "title code creditHours" },
  });

  if (!student.program) {
    return { hasProgram: false };
  }
  const program = student.program;

  const transcript = await computeTranscriptForStudent(studentId);

  const grades = await Grade.find({ student: studentId }).populate({
    path: "courseOffering",
    select: "course",
    populate: { path: "course", select: "_id creditHours" },
  });

  const passedCourseIds = new Set(
    grades
      .filter((g) => g.finalLetter !== "F" && g.courseOffering?.course)
      .map((g) => String(g.courseOffering.course._id))
  );

  // Earned credit hours toward the degree — deliberately NOT the same as
  // transcript.cumulativeCredits, which also counts a failed course's
  // credit hours (correctly, for GPA math — an F still lowers your GPA at
  // its full weight). A failed course hasn't actually been "earned"
  // toward graduation, so this sums only passing grades.
  const creditHoursEarned = grades
    .filter((g) => g.finalLetter !== "F" && g.courseOffering?.course)
    .reduce((sum, g) => sum + (g.courseOffering.course.creditHours || 0), 0);

  const completedRequired = [];
  const remainingRequired = [];
  for (const course of program.requiredCourses) {
    (passedCourseIds.has(String(course._id)) ? completedRequired : remainingRequired).push(course);
  }

  const standing = computeAcademicStanding(transcript.cumulativeGpa);
  const meetsCreditHours = creditHoursEarned >= program.totalCreditHoursRequired;
  const meetsGpa = transcript.cumulativeGpa !== null && transcript.cumulativeGpa >= program.minGpaToGraduate;
  const readyToGraduate = remainingRequired.length === 0 && meetsCreditHours && meetsGpa;

  return {
    hasProgram: true,
    program: {
      _id: program._id,
      name: program.name,
      code: program.code,
      totalCreditHoursRequired: program.totalCreditHoursRequired,
      minGpaToGraduate: program.minGpaToGraduate,
    },
    completedRequired,
    remainingRequired,
    creditHoursEarned,
    cumulativeGpa: transcript.cumulativeGpa,
    standing,
    readyToGraduate,
    meetsCreditHours,
    meetsGpa,
  };
}

/**
 * GET /api/degree-audit/me (Student only)
 */
const getMyDegreeAudit = asyncHandler(async (req, res) => {
  const data = await computeDegreeAudit(req.user._id);
  res.status(200).json({ success: true, data });
});

module.exports = { computeDegreeAudit, getMyDegreeAudit };
