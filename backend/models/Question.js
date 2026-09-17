const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: [true, "Quiz is required"],
  },
  // "mcq" is auto-graded at submission. "subjective" (short-answer/essay)
  // can't be auto-graded — it goes to "pending" and awaits a Teacher's HITL
  // review via the grading endpoints, per CLAUDE.md's HITL rule.
  type: {
    type: String,
    enum: { values: ["mcq", "subjective"], message: "Type must be mcq or subjective" },
    default: "mcq",
  },
  text: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
    maxlength: [1000, "Question text cannot exceed 1000 characters"],
  },
  options: {
    type: [String],
    required: function () {
      return this.type === "mcq";
    },
    validate: {
      validator: function (arr) {
        if (this.type !== "mcq") return true;
        return Array.isArray(arr) && arr.length === 4 && arr.every((o) => o && o.trim().length > 0);
      },
      message: "Exactly 4 non-empty options are required for MCQ questions",
    },
  },
  // Never sent to a student taking the quiz — mirrors User.passwordHash's
  // select:false pattern. Only explicitly `.select("+correctOptionIndex")`
  // for the owning teacher/admin, or server-side when computing a grade.
  correctOptionIndex: {
    type: Number,
    required: function () {
      return this.type === "mcq";
    },
    min: 0,
    max: 3,
    select: false,
  },
  // Points a subjective answer can be awarded (MCQ is always worth 1 and
  // ignores this field, to keep existing scoring behavior unchanged).
  maxScore: {
    type: Number,
    default: 1,
    min: 1,
  },
  order: {
    type: Number,
    default: 0,
  },
  // Optional free-text tag (e.g. "Arrays", "Recursion") — powers US-11's
  // weak-topic analytics. Blank on older questions and grouped under
  // "Untagged" there; never required, so existing quizzes keep working.
  topic: {
    type: String,
    trim: true,
    maxlength: [60, "Topic cannot exceed 60 characters"],
    default: "",
  },
  // select:false — mirrors correctOptionIndex's own pattern exactly, so a
  // student taking the quiz can never read the answer explanation early
  // out of the API response. Shown to a student ONLY after they submit
  // their own attempt (attemptController.getAttemptReview, which
  // explicitly `.select("+explanation")`), and to the owning teacher/admin
  // when building/reviewing a quiz (quizController.getQuizById does the
  // same). For an mcq question, why the correct option is right; for a
  // subjective one, what a strong answer should cover. Optional — blank on
  // questions created before this field existed, exactly like `topic`.
  explanation: {
    type: String,
    trim: true,
    maxlength: [800, "Explanation cannot exceed 800 characters"],
    default: "",
    select: false,
  },
  // Subjective questions only — a sample answer the AI drafts (or a
  // teacher writes/edits) to guide review before grading. Same select:false
  // treatment and reveal points as `explanation` above — never visible to
  // a student attempting the quiz.
  modelAnswer: {
    type: String,
    trim: true,
    maxlength: [3000, "Model answer cannot exceed 3000 characters"],
    default: "",
    select: false,
  },
  // Teacher-controlled toggle: when true AND modelAnswer is non-empty, the
  // AI grading draft (attemptController.draftGradeInBackground) is told to
  // grade against modelAnswer as a rubric instead of grading "blind" from
  // the question text alone. Off by default — matches every other AI
  // feature's opt-in-not-opt-out default in this project, and a model
  // answer written just as student-facing study material (not yet trusted
  // as binding grading criteria) shouldn't silently start driving grades.
  // Not select:false — unlike modelAnswer itself, this boolean reveals
  // nothing about the answer, so there's no leak risk in a student seeing it.
  useRubricForGrading: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Question", questionSchema);
