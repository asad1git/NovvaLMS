const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { createTerm, getTerms } = require("../controllers/termController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin"), createTerm);
router.get("/", getTerms);

module.exports = router;
