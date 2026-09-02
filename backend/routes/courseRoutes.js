const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { uploadMaterialFile, uploadCSV } = require("../middleware/uploadMiddleware");
const {
  createCourse,
  getCourses,
  getCourseById,
  bulkEnrollFromCSV,
  getEnrollments,
} = require("../controllers/courseController");
const { uploadMaterial, getMaterials } = require("../controllers/materialController");
const { createQuiz, generateQuizQuestions, getQuizzesForCourse } = require("../controllers/quizController");

const router = express.Router();

// Every route below requires a valid JWT; role scoping happens per-route
// (list/get are role-scoped inside the controller since all three roles
// can read courses, just different slices of them).
router.use(protect);

router.post("/", authorize("admin"), createCourse);
router.get("/", getCourses);
router.get("/:id", getCourseById);

router.post("/:id/enroll/csv", authorize("admin"), uploadCSV.single("file"), bulkEnrollFromCSV);
router.get("/:id/enrollments", authorize("admin", "teacher"), getEnrollments);

router.post(
  "/:id/materials",
  authorize("admin", "teacher"),
  uploadMaterialFile.single("file"),
  uploadMaterial
);
router.get("/:id/materials", getMaterials);

router.post("/:id/quizzes", authorize("admin", "teacher"), createQuiz);
router.post("/:id/quizzes/generate", authorize("admin", "teacher"), generateQuizQuestions);
router.get("/:id/quizzes", getQuizzesForCourse);

module.exports = router;
