/**
 * Formats an analyticsController.computeAnalyticsForStudent() result into a
 * plain-text summary for an AI system prompt — topic/score data only, never
 * a name or email (both the parent chatbot's and the student chatbot's
 * context-builders rely on this to satisfy CLAUDE.md's PII rule).
 */
function formatAnalyticsSummary(analytics) {
  const { attempts, topics, overall } = analytics;

  const lines = [
    `Total quizzes submitted: ${overall.totalAttempts}`,
    `Overall average score: ${
      overall.averagePercentage !== null ? overall.averagePercentage + "%" : "not yet available (no graded quizzes)"
    }`,
    "",
    "Performance by topic:",
  ];

  if (topics.length === 0) {
    lines.push("(no graded questions yet)");
  } else {
    for (const t of topics) {
      lines.push(`- ${t.topic}: ${t.pointsEarned}/${t.pointsPossible} points (${t.percentage}%)`);
    }
  }

  lines.push("", "Recent quiz results:");
  if (attempts.length === 0) {
    lines.push("(no quizzes submitted yet)");
  } else {
    for (const a of attempts.slice(0, 10)) {
      const scoreText = a.percentage !== null ? `${a.score}/${a.maxScore} (${a.percentage}%)` : "pending teacher review";
      lines.push(`- "${a.quizTitle}" (${a.courseTitle}): ${scoreText}`);
    }
  }

  return lines.join("\n");
}

module.exports = { formatAnalyticsSummary };
