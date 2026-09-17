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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = mongoose.model("Course", courseSchema);
