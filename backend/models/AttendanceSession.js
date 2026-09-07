const mongoose = require("mongoose");

// One document per class meeting. No uniqueness constraint on (course, date)
// — a genuine makeup class could share a date with a regular session, and
// that's the teacher's call, not something to block.
const attendanceSessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    topic: {
      type: String,
      trim: true,
      maxlength: [150, "Topic cannot exceed 150 characters"],
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
