import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  IconSchool,
  IconClock,
  IconSend,
  IconArrowLeft,
  IconArrowRight,
  IconX,
  IconListCheck,
  IconWriting,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { getQuiz, startOrResumeAttempt, autosaveAnswer, submitAttempt } from "../api/quizzes";
import { LoadingState } from "../components/ui";

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isAnswered(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return true;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

export default function QuizAttempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const firstName = (auth?.name || "").split(" ")[0] || "there";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [selections, setSelections] = useState({}); // questionId -> optionIndex | text
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [saveState, setSaveState] = useState("saved"); // "saving" | "saved"
  const [ringOffset, setRingOffset] = useState(377);

  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  const submittedRef = useRef(false);
  const saveTimeoutRef = useRef(null);

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
    setShowModal(false);
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

  // Animate the score ring in once the result screen mounts.
  useEffect(() => {
    if (!result) return;
    const circumference = 377;
    const pct = result.maxScore ? Math.round((result.score / result.maxScore) * 100) : 0;
    const offset = circumference - (pct / 100) * circumference;
    setRingOffset(circumference);
    const t = setTimeout(() => setRingOffset(offset), 150);
    return () => clearTimeout(t);
  }, [result]);

  function setAnswer(questionId, value) {
    setSelections((prev) => ({ ...prev, [questionId]: value }));
    setSaveState("saving");
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveState("saved"), 700);
  }

  if (loading) return <LoadingState label="Loading quiz…" />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page p-5">
        <div className="bg-badge-red-bg text-badge-red-text text-sm rounded-card px-4 py-3 inline-block">
          {error}
        </div>
      </div>
    );
  }

  // ── Result screen ──
  if (result) {
    const pct = result.maxScore ? Math.round((result.score / result.maxScore) * 100) : 0;
    const pass = pct >= 50;
    const mcqCount = questions.filter((q) => q.type !== "subjective").length;
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page p-6">
        <div className="bg-white rounded-xl border border-line shadow-[0_4px_24px_rgba(0,0,0,0.08)] text-center max-w-[480px] w-full px-12 py-11 animate-[fadeIn_0.3s_ease-in]">
          <div className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-5">Quiz Complete</div>

          <div className="relative w-[140px] h-[140px] mx-auto mb-6">
            <svg viewBox="0 0 140 140" width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r="60" fill="none" stroke="#e9ecef" strokeWidth="10" />
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                stroke={pass ? "#1E8449" : "#A32D2D"}
                strokeDasharray="377"
                strokeDashoffset={ringOffset}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[28px] font-extrabold text-navy leading-none">{result.score}</div>
              <div className="text-[11px] text-text-muted mt-1">out of {result.maxScore}</div>
            </div>
          </div>

          <div className="text-xl font-bold text-navy mb-2">
            {pass ? `Great work, ${firstName}! 🎉` : `Keep Practising, ${firstName}`}
          </div>
          <div className="text-sm text-text-muted mb-5">{quiz.title}</div>
          <div
            className={`inline-flex items-center gap-1.5 text-[13px] font-bold rounded-full px-[18px] py-1.5 mb-7 ${
              pass ? "bg-badge-green-bg text-success" : "bg-badge-red-bg text-badge-red-text"
            }`}
          >
            {pass ? <IconCircleCheckFilled size={15} /> : <IconCircleXFilled size={15} />}
            {pass ? "PASSED" : "FAILED"}
          </div>

          {!result.gradingComplete && (
            <div className="bg-badge-amber-bg text-badge-amber-text text-xs rounded-[6px] px-3.5 py-2.5 mb-5 text-left">
              One or more answers are still awaiting your teacher's review — this score may change.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-bg-page rounded-[8px] py-3.5 px-3">
              <div className="text-xl font-bold text-navy mb-0.5">{pct}%</div>
              <div className="text-[11px] text-text-muted uppercase tracking-wide">Percentage</div>
            </div>
            <div className="bg-bg-page rounded-[8px] py-3.5 px-3">
              <div className="text-xl font-bold text-navy mb-0.5">{questions.length}</div>
              <div className="text-[11px] text-text-muted uppercase tracking-wide">Questions</div>
            </div>
            <div className="bg-bg-page rounded-[8px] py-3.5 px-3">
              <div className="text-xl font-bold text-navy mb-0.5">{mcqCount}</div>
              <div className="text-[11px] text-text-muted uppercase tracking-wide">MCQ</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/student")}
              className="inline-flex items-center gap-1.5 bg-transparent text-text-muted border-[1.5px] border-line rounded-input px-6 py-3 text-sm font-semibold transition-colors duration-150 hover:bg-bg-page hover:text-navy"
            >
              <IconLayoutDashboard size={16} /> Dashboard
            </button>
            <button
              onClick={() => navigate("/student")}
              className="inline-flex items-center gap-1.5 bg-navy text-white rounded-input px-6 py-3 text-sm font-semibold transition-colors duration-150 hover:bg-navy-dark"
            >
              View Analytics <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz taking screen ──
  const q = questions[current];
  const total = questions.length;
  const answeredCount = questions.filter((qq) => isAnswered(selections[qq._id])).length;
  const isLast = current === total - 1;
  const isSubjective = q.type === "subjective";

  return (
    <div className="h-screen flex flex-col bg-bg-page overflow-hidden">
      {/* Top bar */}
      <div className="h-[60px] flex-shrink-0 bg-white border-b border-line flex items-center justify-between px-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 bg-navy-light rounded-[7px] flex items-center justify-center flex-shrink-0">
            <IconSchool size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[16px] font-bold text-navy leading-tight">{quiz.title}</div>
            <div className="text-xs text-text-muted mt-0.5">{quiz.durationMinutes} min</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted px-2.5 py-1.5 bg-bg-page rounded-full">
            <span
              className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${
                saveState === "saving" ? "bg-[#f39c12]" : "bg-success animate-pulse"
              }`}
            />
            {saveState === "saving" ? "Saving…" : "Auto-saved"}
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-[6px] border-[1.5px] text-lg font-bold min-w-[110px] justify-center transition-colors duration-300 ${
            remainingMs < 60000
              ? "bg-badge-red-bg border-badge-red-text text-badge-red-text"
              : remainingMs < 300000
              ? "bg-badge-amber-bg border-badge-amber-text text-badge-amber-text"
              : "bg-badge-blue-bg border-navy-light text-navy-light"
          }`}
        >
          <IconClock size={18} />
          {formatTime(remainingMs)}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Navigator */}
        <div className="w-[240px] min-w-[240px] bg-white border-r border-line flex flex-col p-5 overflow-y-auto flex-shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-3.5">Question Navigator</div>
          <div className="flex flex-col gap-1.5 mb-4.5 p-3 bg-bg-page rounded-[6px]">
            <LegendItem className="bg-navy text-white" label="Answered" />
            <LegendItem className="bg-white border-[2.5px] border-navy-light text-navy-light" label="Current" />
            <LegendItem className="bg-white border-2 border-line text-text-muted" label="Unanswered" />
          </div>
          <div className="grid grid-cols-5 gap-2 mb-5">
            {questions.map((qq, i) => {
              const answered = isAnswered(selections[qq._id]);
              const isCurrent = i === current;
              return (
                <button
                  key={qq._id}
                  onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-[6px] flex items-center justify-center text-xs font-semibold transition-all duration-150 border-2 ${
                    answered && isCurrent
                      ? "bg-navy-light text-white border-navy-light"
                      : answered
                      ? "bg-navy text-white border-navy"
                      : isCurrent
                      ? "bg-badge-blue-bg text-navy-light border-navy-light border-[2.5px]"
                      : "bg-white text-text-muted border-line hover:border-navy-light hover:text-navy-light"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>
                {answeredCount} / {total} answered
              </span>
              <span>{Math.round((answeredCount / total) * 100)}%</span>
            </div>
            <div className="h-2 bg-[#e9ecef] rounded-full overflow-hidden">
              <div
                className="h-full bg-navy rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${(answeredCount / total) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-10 py-7">
            <div className="bg-white rounded-card border border-line shadow-[0_1px_6px_rgba(0,0,0,0.06)] px-8 py-7 max-w-[800px] mx-auto">
              <div className="flex items-center gap-2.5 mb-4.5">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  Question {current + 1} of {total}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${
                    isSubjective ? "bg-badge-amber-bg text-badge-amber-text" : "bg-badge-blue-bg text-badge-blue-text"
                  }`}
                >
                  {isSubjective ? <IconWriting size={11} /> : <IconListCheck size={11} />}
                  {isSubjective ? "Subjective" : "MCQ"}
                </span>
              </div>

              <div className="text-base font-semibold text-text-main leading-[1.6] mb-6">{q.text}</div>

              {isSubjective ? (
                <div>
                  <textarea
                    value={selections[q._id] || ""}
                    onChange={(e) => setAnswer(q._id, e.target.value)}
                    placeholder="Type your answer here…"
                    className={`w-full min-h-[160px] resize-y px-4 py-3.5 rounded-[6px] text-sm leading-[1.65] text-text-main bg-[#fafbfc] outline-none transition-[border-color,box-shadow] duration-150 border-[1.5px] focus:bg-white focus:border-navy-light focus:ring-[3px] focus:ring-navy-light/10 ${
                      isAnswered(selections[q._id]) ? "border-success" : "border-line"
                    }`}
                  />
                  <div className="text-[11px] text-text-muted text-right mt-1.5">
                    {(selections[q._id] || "").trim() ? (selections[q._id] || "").trim().split(/\s+/).length : 0} words
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {q.options.map((opt, oi) => {
                    const selected = selections[q._id] === oi;
                    return (
                      <div
                        key={oi}
                        onClick={() => setAnswer(q._id, oi)}
                        className={`flex items-start gap-3.5 px-4 py-3.5 rounded-[6px] border-[1.5px] cursor-pointer transition-all duration-150 ${
                          selected ? "border-navy bg-[#f0f4fb]" : "border-line bg-white hover:border-navy-light hover:bg-badge-blue-bg"
                        }`}
                      >
                        <div
                          className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 border-2 transition-all duration-150 -mt-px ${
                            selected ? "bg-navy text-white border-navy" : "text-text-muted border-line"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}
                        </div>
                        <div className={`text-sm text-text-main leading-[1.55] pt-1 ${selected ? "font-medium" : ""}`}>{opt}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="h-16 flex-shrink-0 bg-white border-t border-line flex items-center justify-between px-10 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="inline-flex items-center gap-1.5 bg-transparent text-text-muted border-[1.5px] border-line rounded-input px-[18px] py-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-bg-page hover:text-navy disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <IconArrowLeft size={15} /> Previous
            </button>
            <div className="text-[13px] text-text-muted">
              <strong className="text-navy">{answeredCount}</strong> of <strong className="text-navy">{total}</strong> questions
              answered
            </div>
            {isLast ? (
              <button
                onClick={() => setShowModal(true)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 bg-success text-white rounded-input px-7 py-3 text-sm font-semibold transition-colors duration-150 hover:bg-[#176b3b] disabled:opacity-45"
              >
                <IconSend size={16} /> Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                className="inline-flex items-center gap-1.5 bg-navy text-white rounded-input px-[18px] py-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-navy-dark"
              >
                Next <IconArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-[100] animate-[fadeIn_0.15s_ease-in]"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-card w-[90%] max-w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="flex items-center justify-between px-[22px] py-4 border-b border-line">
              <h3 className="text-base font-bold text-navy">Submit Quiz?</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-navy transition-colors duration-150">
                <IconX size={20} />
              </button>
            </div>
            <div className="p-[22px]">
              <p className="text-sm text-text-muted leading-[1.6] mb-3">
                You are about to submit <strong className="text-navy">{quiz.title}</strong>. This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-2.5 my-3.5">
                <div className="bg-bg-page rounded-[6px] px-3.5 py-3 text-center">
                  <div className="text-xl font-bold text-navy">{answeredCount}</div>
                  <div className="text-[11px] text-text-muted uppercase tracking-wide mt-0.5">Answered</div>
                </div>
                <div className="bg-bg-page rounded-[6px] px-3.5 py-3 text-center">
                  <div className="text-xl font-bold text-navy">{total - answeredCount}</div>
                  <div className="text-[11px] text-text-muted uppercase tracking-wide mt-0.5">Unanswered</div>
                </div>
              </div>
              <p className="text-xs text-text-muted">Make sure you've reviewed all your answers before submitting.</p>
            </div>
            <div className="px-[22px] py-3.5 border-t border-line flex gap-2.5 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center gap-1.5 bg-transparent text-text-muted border-[1.5px] border-line rounded-input px-[18px] py-2 text-[13px] font-medium transition-colors duration-150 hover:bg-bg-page hover:text-navy"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 bg-success text-white rounded-input px-[18px] py-2 text-[13px] font-medium transition-colors duration-150 hover:bg-[#176b3b] disabled:opacity-45"
              >
                <IconSend size={14} /> {submitting ? "Submitting…" : "Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ className, label }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted">
      <span className={`w-[22px] h-[22px] rounded-[5px] flex-shrink-0 border ${className}`} />
      {label}
    </div>
  );
}
