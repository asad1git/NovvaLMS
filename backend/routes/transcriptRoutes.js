const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { getMyTranscript } = require("../controllers/transcriptController");

const router = express.Router();

router.use(protect);

router.get("/me", authorize("student"), getMyTranscript);

module.exports = router;
