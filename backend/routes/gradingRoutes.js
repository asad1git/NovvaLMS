const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { getPendingGrades, gradeAnswer } = require("../controllers/gradingController");

const router = express.Router();

router.use(protect, authorize("admin", "teacher"));

router.get("/pending", getPendingGrades);
router.put("/:id", gradeAnswer);

module.exports = router;
