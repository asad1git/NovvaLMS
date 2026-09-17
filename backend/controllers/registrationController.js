const asyncHandler = require("express-async-handler");
const CourseOffering = require("../models/CourseOffering");
const Course = require("../models/Course");
const Term = require("../models/Term");
const Enrollment = require("../models/Enrollment");
const Grade = require("../models/Grade");
const { findScheduleConflict, describeSlot } = require("../utils/scheduleConflict");

/**
 * Every schedule-bearing CourseOffering this student is currently enrolled
 * in for the given term — the comparison set for both
 * getRegistrationOfferings' surfaced hint and registerForOffering's actual
 * enforcement, computed once rather than duplicated in each.
 */
async function getStudentScheduleInTerm(studentId, termId) {
  const enrollments = await Enrollment.find({ student: studentId }).populate({
    path: "courseOffering",
    match: { term: termId },
    select: "schedule term course",
    populate: { path: "course", select: "code" },
  });
  return enrollments.filter((e) => e.courseOffering).map((e) => e.courseOffering);
}

/**
 * A term's registration window is separate from its own academic dates
 * (see Term.js's comment) and is treated as CLOSED unless both bounds are
 * explicitly set and `now` falls inside them — missing data must never
 * accidentally grant access.
 */
function isRegistrationOpen(term) {
  if (!term.registrationOpensAt || !term.registrationClosesAt) return false;
  const now = new Date();
  return now >= term.registrationOpensAt && now <= term.registrationClosesAt;
}

/**
 * A student may register for an offering of `course` only if they hold a
 * passing (`finalLetter !== "F"`) finalized Grade for EVERY course listed
 * in `course.prerequisites`, in any term/offering — the prerequisite is a
 * property of the catalog course, not of a specific past offering.
 * Returns the list of still-unmet prerequisite courses (empty = all met).
 */
async function getUnmetPrerequisites(studentId, course) {
  if (!course.prerequisites || course.prerequisites.length === 0) return [];

  const prereqCourses = await Course.find({ _id: { $in: course.prerequisites } }).select("title code");

  const grades = await Grade.find({ student: studentId })
    .populate({ path: "courseOffering", select: "course", populate: { path: "course", select: "_id" } });
  const passedCourseIds = new Set(
    grades
      .filter((g) => g.finalLetter !== "F" && g.courseOffering?.course)
      .map((g) => String(g.courseOffering.course._id))
  );

  return prereqCourses.filter((p) => !passedCourseIds.has(String(p._id)));
}

/**
 * GET /api/registration/offerings?termId=... (Student)
 * Every offering in the given term (defaults to whichever Term has
 * isActive:true) the student is NOT already enrolled in, with seats
 * remaining, whether the registration window is currently open, and
 * whether prerequisites are met — so the frontend can show exactly why a
 * "Register" button is disabled instead of just failing on click.
 */
const getRegistrationOfferings = asyncHandler(async (req, res) => {
  const term = req.query.termId
    ? await Term.findById(req.query.termId)
    : await Term.findOne({ isActive: true });
  if (!term) {
    res.status(404);
    throw new Error("No term found — ask an admin to create or activate one");
  }

  const myOfferingIds = (await Enrollment.find({ student: req.user._id }).select("courseOffering")).map((e) =>
    String(e.courseOffering)
  );

  const offerings = await CourseOffering.find({ term: term._id, _id: { $nin: myOfferingIds } })
    .populate("course", "title code creditHours prerequisites")
    .populate("teacher", "name email")
    .sort({ createdAt: 1 });

  const open = isRegistrationOpen(term);
  const myScheduleThisTerm = await getStudentScheduleInTerm(req.user._id, term._id);

  const data = await Promise.all(
    offerings.map(async (o) => {
      const unmet = await getUnmetPrerequisites(req.user._id, o.course);
      let scheduleConflictWith = null;
      for (const enrolled of myScheduleThisTerm) {
        const conflict = findScheduleConflict(o.schedule, enrolled.schedule);
        if (conflict) {
          scheduleConflictWith = `${enrolled.course.code} (${describeSlot(conflict.b)})`;
          break;
        }
      }
      return {
        _id: o._id,
        title: o.course.title,
        code: o.course.code,
        creditHours: o.course.creditHours,
        teacher: o.teacher,
        sectionLabel: o.sectionLabel,
        schedule: o.schedule,
        seatsRemaining: o.capacity - o.enrolledCount,
        capacity: o.capacity,
        unmetPrerequisites: unmet.map((p) => `${p.code} — ${p.title}`),
        scheduleConflictWith,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: { term, registrationOpen: open, offerings: data },
  });
});

/**
 * POST /api/registration/offerings/:id (Student)
 * The actual self-registration action. Order matters: window and
 * prerequisites are checked first (cheap, no write), THEN the seat is
 * atomically reserved via a single conditional findOneAndUpdate —
 * `$expr: { $lt: ["$enrolledCount", "$capacity"] }` compares two fields
 * of the SAME document, and MongoDB guarantees a single document update
 * is atomic, so two students racing for the last seat can never both
 * succeed. If the Enrollment.create() after that fails for any reason
 * (most likely: already enrolled, caught by the unique index), the
 * reserved seat is released again — the increment must never survive a
 * failed enrollment.
 */
const registerForOffering = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id).populate("course", "prerequisites");
  if (!offering) {
    res.status(404);
    throw new Error("Course not found");
  }

  const term = await Term.findById(offering.term);
  if (!isRegistrationOpen(term)) {
    res.status(400);
    throw new Error("Registration is not open for this term right now");
  }

  const unmet = await getUnmetPrerequisites(req.user._id, offering.course);
  if (unmet.length > 0) {
    res.status(400);
    throw new Error(`Missing prerequisite(s): ${unmet.map((p) => `${p.code} — ${p.title}`).join(", ")}`);
  }

  // Enforced here too, not just surfaced as a hint by getRegistrationOfferings
  // — same "server is the real boundary" principle as the seat-capacity
  // check right below (a determined student could otherwise just POST
  // straight past a disabled button).
  const myScheduleThisTerm = await getStudentScheduleInTerm(req.user._id, offering.term);
  for (const enrolled of myScheduleThisTerm) {
    const conflict = findScheduleConflict(offering.schedule, enrolled.schedule);
    if (conflict) {
      res.status(400);
      throw new Error(
        `Schedule conflict with ${enrolled.course.code} — you're already enrolled in a section meeting ${describeSlot(conflict.b)}`
      );
    }
  }

  const reserved = await CourseOffering.findOneAndUpdate(
    { _id: offering._id, $expr: { $lt: ["$enrolledCount", "$capacity"] } },
    { $inc: { enrolledCount: 1 } },
    { new: true }
  );
  if (!reserved) {
    res.status(400);
    throw new Error("This section is full");
  }

  try {
    const enrollment = await Enrollment.create({ student: req.user._id, courseOffering: offering._id });
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    // The seat reservation above must never outlive a failed enrollment —
    // release it before responding, regardless of why create() failed.
    await CourseOffering.updateOne({ _id: offering._id }, { $inc: { enrolledCount: -1 } });
    if (err.code === 11000) {
      res.status(400);
      throw new Error("You are already enrolled in this course");
    }
    throw err;
  }
});

/**
 * DELETE /api/registration/offerings/:id (Student, own enrollment only)
 * Drops the student's own enrollment and releases the seat atomically.
 * Not gated on the registration window — a drop is always allowed, same
 * as most real registrar systems separate a "drop deadline" from the
 * registration window itself; this pass doesn't model that separate
 * deadline, so dropping stays open-ended.
 */
const dropOffering = asyncHandler(async (req, res) => {
  const deleted = await Enrollment.findOneAndDelete({
    student: req.user._id,
    courseOffering: req.params.id,
  });
  if (!deleted) {
    res.status(404);
    throw new Error("You are not enrolled in this course");
  }

  await CourseOffering.updateOne(
    { _id: req.params.id, enrolledCount: { $gt: 0 } },
    { $inc: { enrolledCount: -1 } }
  );

  res.status(200).json({ success: true, data: { _id: req.params.id } });
});

module.exports = { getRegistrationOfferings, registerForOffering, dropOffering, isRegistrationOpen };
