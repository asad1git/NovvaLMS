const jwt = require("jsonwebtoken");

/**
 * Signs a JWT containing only the minimum needed to authorize requests:
 * the user's id and role. Never put PII (name/email) in the payload —
 * anyone can base64-decode a JWT and read it.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = generateToken;
