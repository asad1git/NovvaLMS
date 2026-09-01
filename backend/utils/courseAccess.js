const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

/**
 * Throws the same way every controller does (res.status() then throw, for
 * errorMiddleware.js to pick up) unless req.user can access this course:
 * an Admin always can, a Teacher only for courses they teach, a Student
 * only for courses they're enrolled in. Returns the loaded course on success.
 */
async function assertCourseAccess(user, res, courseId) {
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (user.role === "admin") return course;

  if (user.role === "teacher") {
    if (String(course.teacher) !== String(user._id)) {
      res.status(403);
      throw new Error("You do not teach this course");
    }
    return course;
  }

  const enrolled = await Enrollment.exists({ student: user._id, course: course._id });
  if (!enrolled) {
    res.status(403);
    throw new Error("You are not enrolled in this course");
  }
  return course;
}

/**
 * Narrower than assertCourseAccess: only an Admin or the course's own
 * Teacher may manage it (roster, materials, enrollment). A Student never
 * qualifies, even if enrolled — used anywhere a Student having "access"
 * to view a course should NOT extend to seeing/changing its management data.
 */
function assertCourseManager(user, res, course) {
  const isOwningTeacher = user.role === "teacher" && String(course.teacher) === String(user._id);
  if (user.role !== "admin" && !isOwningTeacher) {
    res.status(403);
    throw new Error("Only an admin or the course's teacher can manage this course");
  }
}

module.exports = { assertCourseAccess, assertCourseManager };
