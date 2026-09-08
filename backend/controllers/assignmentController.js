const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");
const {
  ASSIGNMENT_QUESTIONS_DIR,
  ASSIGNMENT_SUBMISSIONS_DIR,
} = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ragEngine");
const { verifyFileSignature } = require("../utils/verifyFileSignature");
const { checkExtractability } = require("../utils/checkExtractability");
const { getAIProvider } = require("../services/ai");
const { notifyUsers } = require("../utils/notify");

// Capped the same way chatController caps a named-material's full text —
// generous for a question prompt or a student's write-up, without risking
// an enormous file blowing past the AI request size.
const MAX_GRADING_CONTEXT_CHARS = 20000;

/**
 * Runs the same signature + extraction checks a Material upload does
 * before attaching the file to the record (question doc or submission).
 * Returns the checks' warning (or null) — throws (via res/Error, same
 * pattern as every other controller) and cleans up the file if the
 * signature is wrong.
 */
async function verifyAndCheckUpload(req, res, dir) {
  if (!req.file) {
    res.status(400);
    throw new Error("A PDF, PPTX, DOCX, TXT, JPG, PNG, or ZIP file is required (field name: file, max 20MB)");
  }

  const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
  const filePath = path.join(dir, req.file.filename);

  const signatureMismatch = await verifyFileSignature(filePath, fileType);
  if (signatureMismatch) {
    fs.unlink(filePath, () => {}); // best-effort cleanup of the rejected upload
    res.status(400);
    throw new Error(signatureMismatch);
  }

  const textExtractionWarning = await checkExtractability(filePath, fileType);
  return { fileType, textExtractionWarning };
}

/**
 * HITL, mirrors attemptController.draftGradeInBackground exactly: drafts an
 * AI score + justification from the submission's extracted text against the
 * assignment's own question doc + description, saved as
 * aiDraftScore/aiDraftJustification only — never touches score/feedback/
 * gradeStatus, and runs after the HTTP response is already sent (a real AI
 * call is ~20s; nothing about submitting an assignment should make a
 * student wait that long). Reuses provider.gradeSubjective — no new AI
 * provider method needed, since "grade this free text against this
 * question, out of this max score" is exactly that contract already.
 * Failures are swallowed: the teacher just grades manually, same as before
 * this feature existed.
 */
async function draftAssignmentGradeInBackground(assignment, submissionId) {
  try {
    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) return;

    const questionPath = path.join(ASSIGNMENT_QUESTIONS_DIR, assignment.fileUrl);
    const submissionPath = path.join(ASSIGNMENT_SUBMISSIONS_DIR, submission.fileUrl);

    const [questionFileText, answerText] = await Promise.all([
      extractText(questionPath, assignment.fileType).catch(() => ""),
      extractText(submissionPath, submission.fileType),
    ]);

    const question = [assignment.title, assignment.description, questionFileText]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MAX_GRADING_CONTEXT_CHARS);

    const provider = getAIProvider();
    const draft = await provider.gradeSubjective({
      question,
      maxScore: assignment.maxScore,
      answer: answerText.slice(0, MAX_GRADING_CONTEXT_CHARS),
    });

    submission.aiDraftScore = draft.score;
    submission.aiDraftJustification = draft.justification;
    await submission.save();
  } catch (err) {
    // Intentionally swallowed — see doc comment above.
  }
}

/**
 * POST /api/courses/:id/assignments (Admin or the course's Teacher)
 * The question document + a due date the teacher picks now — the deadline
 * that later decides on-time vs. late for every submission.
 */
const createAssignment = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  assertCourseManager(req.user, res, course);

  const { title, description, dueDate, maxScore } = req.body;
  if (!title || !dueDate || !maxScore) {
    res.status(400);
    throw new Error("title, dueDate, and maxScore are required");
  }

  const { fileType, textExtractionWarning } = await verifyAndCheckUpload(req, res, ASSIGNMENT_QUESTIONS_DIR);

  const assignment = await Assignment.create({
    course: course._id,
    createdBy: req.user._id,
    title,
    description: description || "",
    dueDate,
    maxScore: Number(maxScore),
    fileName: req.file.originalname,
    fileUrl: req.file.filename,
    fileType,
    fileSize: req.file.size,
    textExtractionWarning,
  });

  const enrollments = await Enrollment.find({ course: course._id }).select("student");
  await notifyUsers(
    enrollments.map((e) => e.student),
    {
      type: "assignment_posted",
      title: `New assignment: "${assignment.title}"`,
      message: `A new assignment has been posted in ${course.title}, due ${new Date(assignment.dueDate).toLocaleString()}.`,
    }
  );

  res.status(201).json({ success: true, data: assignment });
});

/**
 * GET /api/courses/:id/assignments — same envelope shape regardless of
 * role ({ assignments }), role-appropriate contents per entry, matching
 * attendanceController.listSessions' own pattern:
 *  - Admin/Teacher: submissionStats (submitted/late/graded counts against
 *    the current roster size).
 *  - Student: their own submission status (or null if not yet submitted)
 *    plus isPastDue, so the UI knows whether to show "Submit" or
 *    "Submit Late".
 */
const getAssignmentsForCourse = asyncHandler(async (req, res) => {
  const course = await assertCourseAccess(req.user, res, req.params.id);
  const assignments = await Assignment.find({ course: course._id }).sort({ dueDate: -1 });
  const isManager = req.user.role === "admin" || String(course.teacher) === String(req.user._id);
  const now = new Date();

  if (isManager) {
    const totalEnrolled = await Enrollment.countDocuments({ course: course._id });
    const data = await Promise.all(
      assignments.map(async (a) => {
        const submissions = await AssignmentSubmission.find({ assignment: a._id });
        return {
          ...a.toObject(),
          submissionStats: {
            totalEnrolled,
            submittedCount: submissions.length,
            lateCount: submissions.filter((s) => s.isLate).length,
            gradedCount: submissions.filter((s) => s.gradeStatus === "graded").length,
          },
        };
      })
    );
    return res.status(200).json({ success: true, data });
  }

  const mySubmissions = await AssignmentSubmission.find({
    assignment: { $in: assignments.map((a) => a._id) },
    student: req.user._id,
  });
  const submissionByAssignment = new Map(mySubmissions.map((s) => [String(s.assignment), s]));

  const data = assignments.map((a) => ({
    ...a.toObject(),
    isPastDue: now > a.dueDate,
    mySubmission: submissionByAssignment.get(String(a._id)) || null,
  }));

  res.status(200).json({ success: true, data });
});

/**
 * GET /api/assignments/:id/download — Admin, the owning Teacher, or an
 * enrolled Student. The question document stays downloadable at any time,
 * before or after the deadline — a late submitter still needs the prompt.
 */
const downloadAssignmentFile = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error("Assignment not found");
  }
  await assertCourseAccess(req.user, res, assignment.course);

  const filePath = path.join(ASSIGNMENT_QUESTIONS_DIR, assignment.fileUrl);
  res.download(filePath, assignment.fileName);
});

/**
 * POST /api/assignments/:id/submit (Student, enrolled)
 * No hard cutoff — a submission after the due date is still accepted, just
 * flagged `isLate` (computed once, here, against the deadline as it stood
 * at submit time) so the teacher can see who submitted on time vs. late.
 * Resubmitting before grading replaces the file in place (same _id, same
 * pattern as materialController.replaceMaterial); once graded, the
 * submission is locked — matches this project's HITL principle that a
 * teacher's decision is the final word.
 */
const submitAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error("Assignment not found");
  }
  const course = await Course.findById(assignment.course);
  const enrolled = await Enrollment.exists({ student: req.user._id, course: course._id });
  if (!enrolled) {
    res.status(403);
    throw new Error("You are not enrolled in this course");
  }

  const existing = await AssignmentSubmission.findOne({ assignment: assignment._id, student: req.user._id });
  if (existing && existing.gradeStatus === "graded") {
    res.status(400);
    throw new Error("This assignment has already been graded and can no longer be resubmitted");
  }

  const { fileType, textExtractionWarning } = await verifyAndCheckUpload(req, res, ASSIGNMENT_SUBMISSIONS_DIR);
  const submittedAt = new Date();
  const isLate = submittedAt > assignment.dueDate;

  let submission;
  if (existing) {
    const oldFileUrl = existing.fileUrl;
    existing.fileName = req.file.originalname;
    existing.fileUrl = req.file.filename;
    existing.fileType = fileType;
    existing.fileSize = req.file.size;
    existing.submittedAt = submittedAt;
    existing.isLate = isLate;
    existing.aiDraftScore = null;
    existing.aiDraftJustification = "";
    submission = await existing.save();
    fs.unlink(path.join(ASSIGNMENT_SUBMISSIONS_DIR, oldFileUrl), () => {}); // best-effort, only after the new file is safely attached
  } else {
    submission = await AssignmentSubmission.create({
      assignment: assignment._id,
      student: req.user._id,
      fileName: req.file.originalname,
      fileUrl: req.file.filename,
      fileType,
      fileSize: req.file.size,
      submittedAt,
      isLate,
    });
  }

  const responseData = textExtractionWarning ? { ...submission.toObject(), textExtractionWarning } : submission;
  res.status(200).json({ success: true, data: responseData });

  // Fire-and-forget, intentionally not awaited — see doc comment above.
  draftAssignmentGradeInBackground(assignment, submission._id).catch(() => {});
});

/**
 * GET /api/assignments/:id/submissions (Admin or the course's Teacher)
 * Full roster view: every submission plus which enrolled students haven't
 * submitted at all — mirrors attendanceController's auto-seeded roster
 * visibility, so a teacher can see gaps, not just what exists.
 */
const getSubmissionsForAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    res.status(404);
    throw new Error("Assignment not found");
  }
  const course = await Course.findById(assignment.course);
  assertCourseManager(req.user, res, course);

  const [submissions, enrollments] = await Promise.all([
    AssignmentSubmission.find({ assignment: assignment._id }).populate("student", "name email").sort({ submittedAt: 1 }),
    Enrollment.find({ course: course._id }).populate("student", "name email"),
  ]);

  const submittedIds = new Set(submissions.map((s) => String(s.student._id)));
  const notSubmitted = enrollments
    .map((e) => e.student)
    .filter((s) => !submittedIds.has(String(s._id)));

  res.status(200).json({ success: true, data: { assignment, submissions, notSubmitted } });
});

/**
 * GET /api/assignments/submissions/:id/download — Admin, the owning
 * Teacher, or the submitting Student themselves.
 */
const downloadSubmissionFile = asyncHandler(async (req, res) => {
  const submission = await AssignmentSubmission.findById(req.params.id);
  if (!submission) {
    res.status(404);
    throw new Error("Submission not found");
  }

  const isOwner = String(submission.student) === String(req.user._id);
  if (!isOwner) {
    const assignment = await Assignment.findById(submission.assignment);
    const course = await Course.findById(assignment.course);
    assertCourseManager(req.user, res, course);
  }

  const filePath = path.join(ASSIGNMENT_SUBMISSIONS_DIR, submission.fileUrl);
  res.download(filePath, submission.fileName);
});

/**
 * PUT /api/assignments/submissions/:id (Admin or the course's Teacher)
 * HITL approve/override step, mirrors gradingController.gradeAnswer: the
 * frontend pre-fills score/feedback from aiDraftScore/aiDraftJustification,
 * but whatever the Teacher actually submits here becomes the one and only
 * final grade — the AI's draft never counts on its own.
 */
const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await AssignmentSubmission.findById(req.params.id);
  if (!submission) {
    res.status(404);
    throw new Error("Submission not found");
  }

  const assignment = await Assignment.findById(submission.assignment);
  const course = await Course.findById(assignment.course);
  assertCourseManager(req.user, res, course);

  const { score, feedback } = req.body;
  if (score === undefined || score === null || score < 0 || score > assignment.maxScore) {
    res.status(400);
    throw new Error(`Score must be between 0 and ${assignment.maxScore}`);
  }

  submission.score = score;
  submission.feedback = feedback || "";
  submission.gradeStatus = "graded";
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  await submission.save();

  await notifyUsers([submission.student], {
    type: "assignment_graded",
    title: `Your assignment "${assignment.title}" has been graded`,
    message: `Your grade for "${assignment.title}" in ${course.title} is now final: ${submission.score}/${assignment.maxScore}.`,
  });

  res.status(200).json({ success: true, data: submission });
});

module.exports = {
  createAssignment,
  getAssignmentsForCourse,
  downloadAssignmentFile,
  submitAssignment,
  getSubmissionsForAssignment,
  downloadSubmissionFile,
  gradeSubmission,
};
