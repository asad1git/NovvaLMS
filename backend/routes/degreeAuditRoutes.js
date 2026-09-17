const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { getMyDegreeAudit } = require("../controllers/degreeAuditController");

const router = express.Router();

router.use(protect);

router.get("/me", authorize("student"), getMyDegreeAudit);

module.exports = router;
