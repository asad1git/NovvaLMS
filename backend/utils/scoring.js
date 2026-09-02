const Question = require("../models/Question");
const Answer = require("../models/Answer");
const QuizAttempt = require("../models/QuizAttempt");

/**
 * Recomputes an attempt's score/maxScore/gradingComplete from scratch by
 * comparing every Question against its Answer. MCQ questions are graded
 * inline (always resolved); a subjective question only contributes once its
 * Answer has been graded by a Teacher — until then `gradingComplete` stays
 * false and the reported score is provisional (MCQ points only).
 *
 * Called both right after submission (US-08) and every time a Teacher grades
 * one more subjective answer (HITL) — the second caller is why this lives in
 * its own module rather than inline in one controller.
 */
async function recomputeAttemptScore(attemptId) {
  const attempt = await QuizAttempt.findById(attemptId);
  const questions = await Question.find({ quiz: attempt.quiz }).select("+correctOptionIndex");
  const answers = await Answer.find({ attempt: attempt._id });
  const answerByQuestion = new Map(answers.map((a) => [String(a.question), a]));

  let score = 0;
  let maxScore = 0;
  let gradingComplete = true;

  for (const q of questions) {
    if (q.type === "subjective") {
      maxScore += q.maxScore;
      const a = answerByQuestion.get(String(q._id));
      if (a && a.gradeStatus === "graded") {
        score += a.score || 0;
      } else {
        gradingComplete = false;
      }
    } else {
      maxScore += 1;
      const a = answerByQuestion.get(String(q._id));
      if (a && a.selectedOptionIndex === q.correctOptionIndex) score += 1;
    }
  }

  attempt.score = score;
  attempt.maxScore = maxScore;
  attempt.totalQuestions = questions.length;
  attempt.gradingComplete = gradingComplete;
  await attempt.save();

  return attempt;
}

module.exports = { recomputeAttemptScore };
