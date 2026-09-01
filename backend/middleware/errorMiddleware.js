/**
 * Catches 404s that fall through every route.
 */
function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Single global error handler. Every controller uses express-async-handler,
 * so any thrown error (or rejected promise) lands here instead of crashing
 * the process. Returns the standard { success, message } shape used across
 * every Novva LMS endpoint.
 */
function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Multer (file upload) errors — thrown before any res.status() call, and
  // before express-async-handler is even in the picture, so they need their
  // own mapping here instead of relying on the controller having set one.
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File exceeds the maximum allowed size";
    }
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already in use`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
