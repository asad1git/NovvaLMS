const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

/**
 * US-02 — POST /api/auth/login
 * Given valid credentials, when the user logs in, then a JWT is issued
 * and the frontend routes them to their role-specific dashboard.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  // Same generic message whether the email doesn't exist or the password
  // is wrong — never reveal which one it was, that leaks account existence.
  const invalidCreds = () => {
    res.status(401);
    throw new Error("Invalid email or password");
  };

  if (!user) return invalidCreds();
  if (!user.isActive) {
    res.status(403);
    throw new Error("This account has been disabled. Contact your administrator.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return invalidCreds();

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    data: {
      token,
      role: user.role,
      name: user.name,
    },
  });
});

/**
 * GET /api/auth/me
 * Returns the profile of whoever the Bearer token belongs to.
 * Used by the frontend on page refresh to restore session state.
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
    },
  });
});

/**
 * US-01 — POST /api/users  (Admin only, mounted in userRoutes)
 * Given valid user details, when the Admin submits the form, then the
 * system hashes the password and emails credentials.
 *
 * The password is auto-generated here rather than chosen by the Admin —
 * this matches "automated credential delivery via email" from the SDS.
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    res.status(400);
    throw new Error("Name, email, and role are required");
  }

  if (!["admin", "teacher", "student"].includes(role)) {
    res.status(400);
    throw new Error("Role must be admin, teacher, or student");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const tempPassword = crypto.randomBytes(6).toString("base64url"); // e.g. "Xk9pQr2b"

  const user = new User({ name, email: email.toLowerCase(), role });
  await user.setPassword(tempPassword);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Your Novva LMS account has been created",
    html: `
      <p>Hello ${user.name},</p>
      <p>An account has been created for you on Novva LMS as a <b>${user.role}</b>.</p>
      <p><b>Email:</b> ${user.email}<br/>
         <b>Temporary Password:</b> ${tempPassword}</p>
      <p>Please log in and you will be prompted to change this password.</p>
    `,
  });

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
});

/**
 * PUT /api/auth/me — self-service profile edit (name only; email/role are
 * admin-managed via userRoutes to keep account identity changes auditable).
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400);
      throw new Error("Name cannot be empty");
    }
    req.user.name = name.trim();
    await req.user.save();
  }

  res.status(200).json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
    },
  });
});

/**
 * PUT /api/auth/me/password — self-service password change. Requires the
 * current password (never a bare reset) so a hijacked session token alone
 * can't lock the real owner out.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }
  if (newPassword.length < 8) {
    res.status(400);
    throw new Error("New password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+passwordHash");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    // 400, not 401 — this is a fully-authenticated user submitting a wrong
    // value, not an invalid/expired session. A 401 here would trip the
    // frontend's global interceptor (api/axios.js) and force-log them out
    // instead of showing an inline "incorrect password" error.
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  await user.setPassword(newPassword);
  await user.save();

  res.status(200).json({ success: true, data: { message: "Password updated" } });
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/auth/forgot-password — public, no auth.
 * Always responds with the same generic message regardless of whether the
 * email exists, same principle as login's invalidCreds — never let this
 * endpoint be used to enumerate registered accounts.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const genericResponse = {
    success: true,
    data: { message: "If an account exists for that email, a password reset link has been sent." },
  };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    return res.status(200).json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your Novva LMS password",
    html: `
      <p>Hello ${user.name},</p>
      <p>We received a request to reset your Novva LMS password. This link expires in 1 hour:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email — your password will not change.</p>
    `,
  });

  res.status(200).json(genericResponse);
});

/**
 * POST /api/auth/reset-password — public, no auth.
 * The raw token only ever exists in the emailed link; the DB holds just its
 * SHA-256 hash, so this look-up can never be satisfied by DB access alone.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400);
    throw new Error("Token and new password are required");
  }
  if (newPassword.length < 8) {
    res.status(400);
    throw new Error("New password must be at least 8 characters");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!user) {
    res.status(400);
    throw new Error("This reset link is invalid or has expired");
  }

  await user.setPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  res.status(200).json({ success: true, data: { message: "Password has been reset. You can now log in." } });
});

module.exports = { login, getMe, createUser, updateMe, changePassword, forgotPassword, resetPassword };
