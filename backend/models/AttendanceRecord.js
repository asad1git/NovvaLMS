const mongoose = require("mongoose");

// One record per (session, student) — auto-seeded as "present" when a
// session is created, then the teacher flips exceptions. Same
// unique-pair-index shape as QuizAttempt's (quiz, student).
const attendanceRecordSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AttendanceSession",
    required: [true, "Session is required"],
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Student is required"],
  },
  status: {
    type: String,
    enum: { values: ["present", "absent", "late", "excused"], message: "Invalid attendance status" },
    default: "present",
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
});

attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
