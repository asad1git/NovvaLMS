const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { autosaveAnswer, submitAttempt } = require("../controllers/attemptController");

const router = express.Router();

// Every route here mutates a student's own in-progress attempt.
router.use(protect, authorize("student"));

router.put("/:id/answers", autosaveAnswer);
router.post("/:id/submit", submitAttempt);

module.exports = router;
