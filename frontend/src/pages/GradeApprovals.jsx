import { useEffect, useState } from "react";
import { getPendingGrades, gradeAnswer } from "../api/quizzes";

// Resolves what the score/feedback inputs should show: the teacher's own
// edit if they've touched the field this session, else the AI's draft
// (pre-filled so "approve" is just clicking Save), else blank.
function resolveField(draft, field, answer, aiField) {
  if (draft[field] !== undefined) return draft[field];
  if (answer[aiField] !== null && answer[aiField] !== undefined && answer[aiField] !== "") return answer[aiField];
  return "";
}

export default function GradeApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState({}); // answerId -> { score, feedback }
  const [savingId, setSavingId] = useState(null);

  async function refresh() {
    try {
      setPending(await getPendingGrades());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pending grades");
    }
  }

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  function updateDraft(answerId, patch) {
    setDrafts((prev) => ({ ...prev, [answerId]: { ...prev[answerId], ...patch } }));
  }

  async function handleGrade(answer) {
    const draft = drafts[answer._id] || {};
    const score = resolveField(draft, "score", answer, "aiDraftScore");
    const feedback = resolveField(draft, "feedback", answer, "aiDraftJustification");
    if (score === "") return;
    setSavingId(answer._id);
    setError("");
    try {
      await gradeAnswer(answer._id, Number(score), feedback);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save grade");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading pending grades…</div>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Grade Approvals ({pending.length})</h2>
        <p className="text-[11px] text-gray-500 mb-4">
          Subjective quiz answers awaiting your review, across every course you teach.
        </p>

        <div className="space-y-4">
          {pending.length === 0 && (
            <p className="text-xs text-gray-500">Nothing pending — all subjective answers are graded.</p>
          )}
          {pending.map((a) => {
            const draft = drafts[a._id] || {};
            const hasAiDraft = a.aiDraftScore !== null && a.aiDraftScore !== undefined;
            const scoreValue = resolveField(draft, "score", a, "aiDraftScore");
            const feedbackValue = resolveField(draft, "feedback", a, "aiDraftJustification");
            return (
              <div key={a._id} className="border border-gray-100 rounded p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-900">
                    {a.studentName} — {a.courseCode} / {a.quizTitle}
                  </span>
                  <span className="text-[10px] text-gray-400">max {a.maxScore} pts</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{a.questionText}</p>
                <div className="bg-gray-50 border border-gray-100 rounded p-2 text-xs text-gray-800 mb-3 whitespace-pre-wrap">
                  {a.textAnswer || <span className="text-gray-400 italic">No answer submitted.</span>}
                </div>

                {hasAiDraft ? (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-badge-blue-bg text-badge-blue-text">
                      AI Suggested: {a.aiDraftScore}/{a.maxScore}
                    </span>
                    <span className="text-[10px] text-gray-400">— review and save, or edit before saving</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 mb-2">
                    No AI draft yet (still drafting, or drafting failed) — grade manually below.
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={a.maxScore}
                    placeholder={`Score (0-${a.maxScore})`}
                    className="w-32 border border-gray-300 rounded px-2 py-1.5 text-xs"
                    value={scoreValue}
                    onChange={(e) => updateDraft(a._id, { score: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Feedback (optional)"
                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs"
                    value={feedbackValue}
                    onChange={(e) => updateDraft(a._id, { feedback: e.target.value })}
                  />
                  <button
                    onClick={() => handleGrade(a)}
                    disabled={savingId === a._id || scoreValue === ""}
                    className="bg-navy text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-50"
                  >
                    {savingId === a._id ? "Saving…" : "Save Grade"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
