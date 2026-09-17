const mongoose = require("mongoose");

// A pure catalog entry — "CS201, Data Structures" exists once, forever,
// independent of who teaches it or when. `teacher` used to live here;
// it moved to CourseOffering (see that model's comment) since a course
// can be taught by different teachers in different terms, or even
// multiple teachers/sections in the same term.
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    code: {
      type: String,
      required: [true, "Course code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, "Course code cannot exceed 20 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    // Powers GPA — a term GPA is the credit-hour-weighted average of every
    // finalized course grade in it, so this has to exist per catalog course
    // (not per offering — the same course carries the same credit weight
    // regardless of who teaches it or when).
    creditHours: {
      type: Number,
      required: [true, "Credit hours is required"],
      min: [1, "Credit hours must be at least 1"],
      default: 3,
    },
    // Courses (not offerings) a student must have a passing finalized
    // Grade in, in ANY term/offering, before self-registering into an
    // offering of THIS course. Lives on the catalog entry, not the
    // offering, since a prerequisite requirement is a property of the
    // course itself, independent of which term/section is being taken.
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Course", courseSchema);
