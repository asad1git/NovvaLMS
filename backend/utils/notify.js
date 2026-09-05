const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("./sendEmail");

/**
 * Creates an in-app Notification for each user and emails them, in that
 * order of importance: the DB write is awaited (fast — it's what
 * `GET /api/notifications` reads, so it must exist before this returns),
 * but email delivery is fire-and-forget, same principle as the AI grading
 * draft in attemptController.submitAttempt — a slow or failed SMTP call
 * must never block or fail the action that triggered the notification
 * (publishing a quiz, posting a grade, issuing a challan).
 */
async function notifyUsers(userIds, { type, title, message }) {
  if (!userIds || userIds.length === 0) return;

  await Notification.insertMany(userIds.map((userId) => ({ user: userId, type, title, message })));

  User.find({ _id: { $in: userIds } })
    .select("name email")
    .then((users) =>
      Promise.all(
        users.map((u) => sendEmail({ to: u.email, subject: title, html: `<p>Hello ${u.name},</p><p>${message}</p>` }))
      )
    )
    .catch(() => {});
}

module.exports = { notifyUsers };
