const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const {
  linkParent,
  listParentLinks,
  unlinkParent,
  getMyChildren,
  getChildAnalytics,
} = require("../controllers/parentLinkController");

const router = express.Router();

router.use(protect);

router.get("/my-children", authorize("parent"), getMyChildren);
router.get("/:studentId/analytics", authorize("parent"), getChildAnalytics);

router.post("/", authorize("admin"), linkParent);
router.get("/", authorize("admin"), listParentLinks);
router.delete("/:id", authorize("admin"), unlinkParent);

module.exports = router;
