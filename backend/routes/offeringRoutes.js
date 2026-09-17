const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { createOffering } = require("../controllers/offeringController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin"), createOffering);

module.exports = router;
