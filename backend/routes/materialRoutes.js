const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { downloadMaterial, deleteMaterial } = require("../controllers/materialController");

const router = express.Router();

router.use(protect);

// Access-controlled inside the controller (Admin, owning Teacher, or an
// enrolled Student may download; only Admin/owning Teacher may delete).
router.get("/:id/download", downloadMaterial);
router.delete("/:id", authorize("admin", "teacher"), deleteMaterial);

module.exports = router;
