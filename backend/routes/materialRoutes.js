const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { uploadMaterialFile } = require("../middleware/uploadMiddleware");
const { downloadMaterial, replaceMaterial, deleteMaterial } = require("../controllers/materialController");

const router = express.Router();

router.use(protect);

// Access-controlled inside the controller (Admin, owning Teacher, or an
// enrolled Student may download; only Admin/owning Teacher may replace or delete).
router.get("/:id/download", downloadMaterial);
router.put("/:id/replace", authorize("admin", "teacher"), uploadMaterialFile.single("file"), replaceMaterial);
router.delete("/:id", authorize("admin", "teacher"), deleteMaterial);

module.exports = router;
