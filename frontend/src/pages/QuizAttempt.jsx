import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import { getQuiz, startOrResumeAttempt, autosaveAnswer, submitAttempt } from "../api/quizzes";

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuizAttempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [selections, setSelections] = useState({}); // questionId -> optionIndex
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const quizData = await getQuiz(quizId);
        const attemptData = await startOrResumeAttempt(quizId);

        setQuiz(quizData.quiz);
        setQuestions(quizData.questions);
        setAttempt(attemptData.attempt);

        const initial = {};
        attemptData.answers.forEach((a) => {
          if (a.selectedOptionIndex !== null && a.selectedOptionIndex !== undefined) {
            initial[a.question] = a.selectedOptionIndex;
          } else if (a.textAnswer) {
            initial[a.question] = a.textAnswer;
          }
        });
        setSelections(initial);

        if (attemptData.attempt.submittedAt) {
          submittedRef.current = true;
          setResult({
            score: attemptData.attempt.score,
            maxScore: attemptData.attempt.maxScore,
            gradingComplete: attemptData.attempt.gradingComplete,
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  async function flushAnswers(attemptId) {
    const entries = Object.entries(selectionsRef.current);
    await Promise.all(
      entries.map(([questionId, selectedOptionIndex]) =>
        autosaveAnswer(attemptId, questionId, selectedOptionIndex).catch(() => {})
      )
    );
  }

  async function handleSubmit() {
    if (submittedRef.current || !attempt) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await flushAnswers(attempt._id);
      const finalAttempt = await submitAttempt(attempt._id);
      setResult({
        score: finalAttempt.score,
        maxScore: finalAttempt.maxScore,
        gradingComplete: finalAttempt.gradingComplete,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit quiz");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  // Countdown + auto-submit at zero.
  useEffect(() => {
    if (!attempt || attempt.submittedAt || result) return;

    const deadline = new Date(attempt.startedAt).getTime() + quiz.durationMinutes * 60 * 1000;

    const tick = () => {
      const remaining = deadline - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        handleSubmit();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, quiz, result]);

  // US-08's "30s auto-save" — periodic sync rather than a request per click.
  useEffect(() => {
    if (!attempt || attempt.submittedAt || result) return;
    const interval = setInterval(() => {
      if (!submittedRef.current) flushAnswers(attempt._id);
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, result]);

  function setAnswer(questionId, value) {
    setSelections((prev) => ({ ...prev, [questionId]: value }));
  }

  if (loading) return <div className="p-5 text-sm text-gray-500">Loading quiz…</div>;

  if (error) {
    return (
      <div className="p-5">
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 inline-block">
          {error}
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      role="Student"
      navItems={["Dashboard", "My Courses", "My Results", "Analytics", "AI Chatbot"]}
      activeNav="My Courses"
      onNavClick={() => navigate("/student")}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => navigate("/student")} className="text-xs text-navy-light hover:underline">
          ← Back to courses
        </button>

        <div className="bg-white border border-gray-200 rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">{quiz.title}</h2>
            {!result && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  remainingMs < 60000 ? "bg-badge-red-bg text-badge-red-text" : "bg-badge-blue-bg text-badge-blue-text"
                }`}
              >
                {formatTime(remainingMs)}
              </span>
            )}
          </div>

          {result ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-1">Quiz submitted.</p>
              <p className="text-2xl font-semibold text-gray-900">
                {result.score} / {result.maxScore}
              </p>
              {!result.gradingComplete && (
                <p className="text-xs text-badge-amber-text mt-2">
                  One or more answers are still awaiting your teacher's review — this score may change.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {questions.map((q, i) => (
                <div key={q._id} className="border border-gray-100 rounded p-4">
                  <p className="text-xs font-medium text-gray-900 mb-3">
                    {i + 1}. {q.text}
                    {q.type === "subjective" && (
                      <span className="text-gray-400 font-normal"> ({q.maxScore} pts, graded by teacher)</span>
                    )}
                  </p>
                  {q.type === "subjective" ? (
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-xs"
                      rows={4}
                      placeholder="Type your answer…"
                      value={selections[q._id] || ""}
                      onChange={(e) => setAnswer(q._id, e.target.value)}
                    />
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${q._id}`}
                            checked={selections[q._id] === oi}
                            onChange={() => setAnswer(q._id, oi)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit Quiz"}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
