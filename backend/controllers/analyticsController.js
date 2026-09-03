const asyncHandler = require("express-async-handler");
const QuizAttempt = require("../models/QuizAttempt");
const Question = require("../models/Question");
const Answer = require("../models/Answer");

/**
 * US-11 — GET /api/analytics/me (Student only)
 * Aggregates every submitted attempt for the logged-in student into:
 *  - a per-quiz results list ("My Results")
 *  - a per-topic breakdown identifying weak topics ("Analytics"), per
 *    CLAUDE.md's "Students get analytics identifying their weak topics".
 *
 * Reuses the exact same resolution rules as utils/scoring.js's
 * recomputeAttemptScore: MCQ is always resolved inline; a subjective
 * question only contributes once a Teacher has graded it (gradeStatus
 * "graded"), so a topic's accuracy is never skewed by answers still
 * awaiting HITL review.
 */
const getMyAnalytics = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ student: req.user._id, submittedAt: { $ne: null } })
    .populate({ path: "quiz", select: "title course", populate: { path: "course", select: "title" } })
    .sort({ submittedAt: -1 });

  const attemptResults = [];
  const topicStats = new Map(); // topic -> { pointsEarned, pointsPossible, questionsResolved }

  for (const attempt of attempts) {
    if (!attempt.quiz) continue; // quiz was deleted after the attempt — skip defensively

    const questions = await Question.find({ quiz: attempt.quiz._id }).select("+correctOptionIndex");
    const answers = await Answer.find({ attempt: attempt._id });
    const answerByQuestion = new Map(answers.map((a) => [String(a.question), a]));

    for (const q of questions) {
      const topic = (q.topic || "").trim() || "Untagged";
      const bucket = topicStats.get(topic) || { pointsEarned: 0, pointsPossible: 0, questionsResolved: 0 };
      const a = answerByQuestion.get(String(q._id));

      if (q.type === "subjective") {
        if (a && a.gradeStatus === "graded") {
          bucket.pointsEarned += a.score || 0;
          bucket.pointsPossible += q.maxScore;
          bucket.questionsResolved += 1;
        }
      } else {
        bucket.pointsPossible += 1;
        bucket.questionsResolved += 1;
        if (a && a.selectedOptionIndex === q.correctOptionIndex) bucket.pointsEarned += 1;
      }

      topicStats.set(topic, bucket);
    }

    attemptResults.push({
      attemptId: attempt._id,
      quizId: attempt.quiz._id,
      quizTitle: attempt.quiz.title,
      courseId: attempt.quiz.course?._id || null,
      courseTitle: attempt.quiz.course?.title || "",
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      totalQuestions: attempt.totalQuestions,
      gradingComplete: attempt.gradingComplete,
      percentage: attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 1000) / 10 : null,
    });
  }

  const topics = Array.from(topicStats.entries())
    .filter(([, s]) => s.pointsPossible > 0)
    .map(([topic, s]) => ({
      topic,
      pointsEarned: s.pointsEarned,
      pointsPossible: s.pointsPossible,
      questionsResolved: s.questionsResolved,
      percentage: Math.round((s.pointsEarned / s.pointsPossible) * 1000) / 10,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const gradedResults = attemptResults.filter((r) => r.percentage !== null);
  const totalEarned = gradedResults.reduce((sum, r) => sum + r.score, 0);
  const totalPossible = gradedResults.reduce((sum, r) => sum + r.maxScore, 0);

  const overall = {
    totalAttempts: attemptResults.length,
    averagePercentage: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 1000) / 10 : null,
    weakTopics: topics.filter((t) => t.percentage < 60).slice(0, 5),
  };

  res.status(200).json({ success: true, data: { attempts: attemptResults, topics, overall } });
});

module.exports = { getMyAnalytics };
