const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { getSessionDetail, updateSessionRecords } = require("../controllers/attendanceController");

const router = express.Router();

router.use(protect);

router.get("/sessions/:sessionId", authorize("admin", "teacher"), getSessionDetail);
router.put("/sessions/:sessionId", authorize("admin", "teacher"), updateSessionRecords);

module.exports = router;
