const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { createDepartment, listDepartments, getDepartmentReport } = require("../controllers/departmentController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin"), createDepartment);
router.get("/", authorize("admin", "registrar", "hod"), listDepartments);
router.get("/:id/report", authorize("admin", "hod"), getDepartmentReport);

module.exports = router;
