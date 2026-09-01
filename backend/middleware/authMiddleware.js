const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

/**
 * `protect` — verifies the Bearer token on every protected route.
 * On success it attaches `req.user` (the full user document, minus the
 * password hash) so downstream controllers and the `authorize` middleware
 * can read `req.user.role` without hitting the database again.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("No token provided");
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401);
    throw new Error(
      err.name === "TokenExpiredError" ? "Session expired, please log in again" : "Invalid token"
    );
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("Account not found or disabled");
  }

  req.user = user;
  next();
});

module.exports = { protect };
