const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);

router.get("/", listNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

module.exports = router;
