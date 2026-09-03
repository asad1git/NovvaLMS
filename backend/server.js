require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const materialRoutes = require("./routes/materialRoutes");
const quizRoutes = require("./routes/quizRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const gradingRoutes = require("./routes/gradingRoutes");
const feeChallanRoutes = require("./routes/feeChallanRoutes");
const salarySlipRoutes = require("./routes/salarySlipRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ─── Core middleware ───
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Health check (useful for confirming the server booted at all) ───
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Novva LMS API is running" });
});

// ─── Feature routes ───
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/grading", gradingRoutes);
app.use("/api/fee-challans", feeChallanRoutes);
app.use("/api/salary-slips", salarySlipRoutes);

// ─── Error handling (must be last) ───
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Novva LMS API listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
});

module.exports = app;
