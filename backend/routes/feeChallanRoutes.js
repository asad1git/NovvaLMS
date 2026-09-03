const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const {
  createFeeChallan,
  getFeeChallans,
  setFeeChallanStatus,
  downloadFeeChallanPdf,
} = require("../controllers/feeChallanController");

const router = express.Router();

router.use(protect);

router.post("/", authorize("admin"), createFeeChallan);
router.get("/", getFeeChallans); // role-scoped inside the controller
router.put("/:id/status", authorize("admin"), setFeeChallanStatus);
router.get("/:id/pdf", downloadFeeChallanPdf); // access-checked inside the controller

module.exports = router;
