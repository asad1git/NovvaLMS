const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { createProgram, listPrograms } = require("../controllers/programController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin"), createProgram);
router.get("/", authorize("admin"), listPrograms);

module.exports = router;
