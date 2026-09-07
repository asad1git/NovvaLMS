const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const AttendanceSession = require("../models/AttendanceSession");
const AttendanceRecord = require("../models/AttendanceRecord");
const { assertCourseAccess, assertCourseManager } = require("../utils/courseAccess");

const PRESENT_STATUSES = ["present", "late"]; // both count toward "attended" for percentage purposes

/**
 * POST /api/courses/:id/attendance (Admin or the course's Teacher)
 * Creates a new class session and auto-seeds a record for every currently
 * enrolled student, defaulted to "present" — flipping the few exceptions
 * (absent/late/excused) is less total effort than checking off everyone
 * who showed up, for the common case where most students attend.
 */
const createSession = asyncHandler(async (req, res) => {
  const course = await assertCourseAccess(req.user, res, req.params.id);
  assertCourseManager(req.user, res, course);

  const { date, topic } = req.body;
  if (!date) {
    res.status(400);
    throw new Error("date is required");
  }

  const session = await AttendanceSession.create({
    course: course._id,
    date,
    topic: topic || "",
    createdBy: req.user._id,
  });

  const enrollments = await Enrollment.find({ course: course._id }).select("student");
  if (enrollments.length > 0) {
    await AttendanceRecord.insertMany(
      enrollments.map((e) => ({ session: session._id, student: e.student, status: "present" }))
    );
  }

  res.status(201).json({ success: true, data: session });
});

/**
 * GET /api/courses/:id/attendance — role-scoped, but always the same
 * response envelope ({ sessions, overall }) so the frontend doesn't need to
 * branch on shape, only on which fields are populated:
 *  - Admin/Teacher: every session with a present/total headcount, and an
 *    overall average attendance rate across the whole course.
 *  - Student: every session with just their own status, and their own
 *    overall percentage — the same "one source of truth" computation every
 *    time this is requested.
 */
const listSessions = asyncHandler(async (req, res) => {
  const course = await assertCourseAccess(req.user, res, req.params.id);
  const sessions = await AttendanceSession.find({ course: course._id }).sort({ date: -1 });
  const isManager = req.user.role === "admin" || String(course.teacher) === String(req.user._id);

  if (isManager) {
    let totalPresent = 0;
    let totalMarked = 0;
    const sessionData = await Promise.all(
      sessions.map(async (s) => {
        const records = await AttendanceRecord.find({ session: s._id });
        const presentCount = records.filter((r) => PRESENT_STATUSES.includes(r.status)).length;
        totalPresent += presentCount;
        totalMarked += records.length;
        return { _id: s._id, date: s.date, topic: s.topic, totalStudents: records.length, presentCount };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        sessions: sessionData,
        overall: {
          totalSessions: sessions.length,
          averageAttendanceRate: totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 1000) / 10 : null,
        },
      },
    });
  }

  const myRecords = await AttendanceRecord.find({
    session: { $in: sessions.map((s) => s._id) },
    student: req.user._id,
  });
  const recordBySession = new Map(myRecords.map((r) => [String(r.session), r]));

  const sessionData = sessions.map((s) => ({
    _id: s._id,
    date: s.date,
    topic: s.topic,
    status: recordBySession.get(String(s._id))?.status || null,
  }));

  const counted = sessionData.filter((s) => s.status !== null);
  const presentCount = counted.filter((s) => PRESENT_STATUSES.includes(s.status)).length;

  res.status(200).json({
    success: true,
    data: {
      sessions: sessionData,
      overall: {
        totalSessions: counted.length,
        presentCount,
        percentage: counted.length > 0 ? Math.round((presentCount / counted.length) * 1000) / 10 : null,
      },
    },
  });
});

/**
 * GET /api/attendance/sessions/:sessionId (Admin or the course's Teacher)
 * Full per-student detail for the marking UI.
 */
const getSessionDetail = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Attendance session not found");
  }
  const course = await Course.findById(session.course);
  assertCourseManager(req.user, res, course);

  const records = await AttendanceRecord.find({ session: session._id }).populate("student", "name email");
  records.sort((a, b) => a.student.name.localeCompare(b.student.name)); // populate() runs after the DB sort, so sort client-side here

  res.status(200).json({ success: true, data: { session, records } });
});

/**
 * PUT /api/attendance/sessions/:sessionId (Admin or the course's Teacher)
 * Bulk-updates statuses in one call — { records: [{ studentId, status }] }
 * — matching how a teacher actually works: fill the whole checklist for
 * the class, save once, not one request per student.
 */
const updateSessionRecords = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Attendance session not found");
  }
  const course = await Course.findById(session.course);
  assertCourseManager(req.user, res, course);

  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    res.status(400);
    throw new Error("records must be a non-empty array of { studentId, status }");
  }

  const VALID_STATUSES = ["present", "absent", "late", "excused"];
  for (const r of records) {
    if (!r.studentId || !VALID_STATUSES.includes(r.status)) {
      res.status(400);
      throw new Error("Each record needs a valid studentId and status");
    }
  }

  await Promise.all(
    records.map((r) =>
      AttendanceRecord.updateOne(
        { session: session._id, student: r.studentId },
        { status: r.status, markedAt: new Date() },
        { upsert: true }
      )
    )
  );

  const updatedRecords = await AttendanceRecord.find({ session: session._id }).populate("student", "name email");
  res.status(200).json({ success: true, data: { session, records: updatedRecords } });
});

module.exports = { createSession, listSessions, getSessionDetail, updateSessionRecords };
