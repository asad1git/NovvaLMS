const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const {
  getQuizById,
  publishQuiz,
  startOrResumeAttempt,
  getAttemptsForQuiz,
} = require("../controllers/quizController");

const router = express.Router();

router.use(protect);

router.get("/:id", getQuizById); // role-scoped inside the controller
router.put("/:id/publish", authorize("admin", "teacher"), publishQuiz);
router.post("/:id/attempts", authorize("student"), startOrResumeAttempt);
router.get("/:id/attempts", authorize("admin", "teacher"), getAttemptsForQuiz);

module.exports = router;
