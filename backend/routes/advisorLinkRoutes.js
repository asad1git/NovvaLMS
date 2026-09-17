const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const {
  linkAdvisor,
  listAdvisorLinks,
  unlinkAdvisor,
  getMyAdvisees,
  getAdviseeTranscript,
  getAdviseeRegistration,
  getAdviseeDegreeAudit,
} = require("../controllers/advisorLinkController");

const router = express.Router();

router.use(protect);

router.get("/my-advisees", authorize("advisor"), getMyAdvisees);
router.get("/:studentId/transcript", authorize("advisor"), getAdviseeTranscript);
router.get("/:studentId/registration", authorize("advisor"), getAdviseeRegistration);
router.get("/:studentId/degree-audit", authorize("advisor"), getAdviseeDegreeAudit);

router.post("/", authorize("admin"), linkAdvisor);
router.get("/", authorize("admin"), listAdvisorLinks);
router.delete("/:id", authorize("admin"), unlinkAdvisor);

module.exports = router;
