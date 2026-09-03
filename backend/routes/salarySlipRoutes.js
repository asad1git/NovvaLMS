const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { createSalarySlip, getSalarySlips, downloadSalarySlipPdf } = require("../controllers/salarySlipController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin"), createSalarySlip);
router.get("/", getSalarySlips); // role-scoped inside the controller
router.get("/:id/pdf", downloadSalarySlipPdf); // access-checked inside the controller

module.exports = router;
