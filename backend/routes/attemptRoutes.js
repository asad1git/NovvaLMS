const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { autosaveAnswer, submitAttempt, getAttemptReview } = require("../controllers/attemptController");

const router = express.Router();

router.use(protect, authorize("student"));

router.put("/:id/answers", autosaveAnswer);
router.post("/:id/submit", submitAttempt);
router.get("/:id/review", getAttemptReview);

module.exports = router;
