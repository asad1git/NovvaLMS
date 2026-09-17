const CourseOffering = require("../models/CourseOffering");
const Enrollment = require("../models/Enrollment");

/**
 * Throws the same way every controller does (res.status() then throw, for
 * errorMiddleware.js to pick up) unless req.user can access this
 * CourseOffering: an Admin always can, a Teacher only for offerings they
 * teach, a Student only for offerings they're enrolled in. Returns the
 * loaded offering (with `course` populated for title/code display) on
 * success — every existing caller that used to get a Course back now gets
 * an offering with the same `.title`/`.code` reachable one level down via
 * `.course`, since callers already needed updating to CourseOffering
 * anyway as part of this same pass.
 */
async function assertCourseAccess(user, res, offeringId) {
  const offering = await CourseOffering.findById(offeringId).populate("course", "title code description");
  if (!offering) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (user.role === "admin") return offering;

  if (user.role === "teacher") {
    if (String(offering.teacher) !== String(user._id)) {
      res.status(403);
      throw new Error("You do not teach this course");
    }
    return offering;
  }

  const enrolled = await Enrollment.exists({ student: user._id, courseOffering: offering._id });
  if (!enrolled) {
    res.status(403);
    throw new Error("You are not enrolled in this course");
  }
  return offering;
}

/**
 * Narrower than assertCourseAccess: only an Admin or the offering's own
 * Teacher may manage it (roster, materials, enrollment). A Student never
 * qualifies, even if enrolled — used anywhere a Student having "access"
 * to view a course should NOT extend to seeing/changing its management data.
 */
function assertCourseManager(user, res, offering) {
  const isOwningTeacher = user.role === "teacher" && String(offering.teacher) === String(user._id);
  if (user.role !== "admin" && !isOwningTeacher) {
    res.status(403);
    throw new Error("Only an admin or the course's teacher can manage this course");
  }
}

module.exports = { assertCourseAccess, assertCourseManager };
