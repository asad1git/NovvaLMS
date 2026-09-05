const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

/**
 * GET /api/notifications — any authenticated role, always scoped to self.
 * Latest 50 is plenty at this project's scale; no pagination needed yet.
 */
const listNotifications = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.status(200).json({ success: true, data: { notifications, unreadCount } });
});

/**
 * PUT /api/notifications/:id/read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  notification.read = true;
  await notification.save();
  res.status(200).json({ success: true, data: notification });
});

/**
 * PUT /api/notifications/read-all
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.status(200).json({ success: true, data: { message: "All notifications marked as read" } });
});

module.exports = { listNotifications, markAsRead, markAllAsRead };
