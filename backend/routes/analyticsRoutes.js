const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { getMyAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

router.use(protect, authorize("student"));

router.get("/me", getMyAnalytics);

module.exports = router;
