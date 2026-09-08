const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { uploadAssignmentSubmissionFile } = require("../middleware/uploadMiddleware");
const {
  downloadAssignmentFile,
  submitAssignment,
  getSubmissionsForAssignment,
  downloadSubmissionFile,
  gradeSubmission,
} = require("../controllers/assignmentController");

const router = express.Router();

router.use(protect);

// Access-controlled inside the controller (Admin, owning Teacher, or an
// enrolled Student may download the question file; only Admin/owning
// Teacher may see or grade the submission roster).
router.get("/:id/download", downloadAssignmentFile);
router.post("/:id/submit", authorize("student"), uploadAssignmentSubmissionFile.single("file"), submitAssignment);
router.get("/:id/submissions", authorize("admin", "teacher"), getSubmissionsForAssignment);
router.get("/submissions/:id/download", downloadSubmissionFile);
router.put("/submissions/:id", authorize("admin", "teacher"), gradeSubmission);

module.exports = router;
