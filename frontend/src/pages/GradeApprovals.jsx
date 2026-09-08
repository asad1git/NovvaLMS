import { useEffect, useState } from "react";
import { IconClipboardCheck, IconQuestionMark, IconMessage2, IconRobot, IconCircleCheck } from "@tabler/icons-react";
import { getPendingGrades, gradeAnswer } from "../api/quizzes";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border-[1.5px] border-line rounded-input px-3 py-2 text-[13px] transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light";

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
  const [selectedId, setSelectedId] = useState(null);

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
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save grade");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <LoadingState label="Loading pending grades…" />;

  const selected = pending.find((a) => a._id === selectedId) || null;
  const draft = selected ? drafts[selected._id] || {} : {};
  const scoreValue = selected ? resolveField(draft, "score", selected, "aiDraftScore") : "";
  const feedbackValue = selected ? resolveField(draft, "feedback", selected, "aiDraftJustification") : "";

  return (
    <div className="space-y-4 h-[calc(100vh-130px)] flex flex-col">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-input px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        Pending Submissions ({pending.length})
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-4 flex-1 min-h-0">
        <div className="overflow-y-auto flex flex-col gap-2 pr-1">
          {pending.length === 0 && (
            <Card>
              <EmptyState icon={<IconClipboardCheck size={32} className="text-success" />} title="Nothing pending" subtitle="All subjective answers are graded." />
            </Card>
          )}
          {pending.map((a) => (
            <div
              key={a._id}
              onClick={() => setSelectedId(a._id)}
              className={`bg-white border-[1.5px] rounded-card p-3.5 cursor-pointer transition-[border-color,box-shadow] duration-150 ${
                selectedId === a._id
                  ? "border-navy-light shadow-[0_0_0_3px_rgba(46,117,182,0.12)] bg-[#f8fbff]"
                  : "border-line hover:border-navy-light"
              }`}
            >
              <div className="text-[13px] font-semibold text-text-main mb-0.5">{a.studentName}</div>
              <div className="text-[11px] text-text-muted mb-2">
                {a.courseCode} · {a.quizTitle}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">AI Suggested:</span>
                {a.aiDraftScore !== null && a.aiDraftScore !== undefined ? (
                  <Badge variant="amber">
                    {a.aiDraftScore}/{a.maxScore}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-text-muted">—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <Card className="overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
              <IconClipboardCheck size={44} stroke={1.3} />
              <div className="text-sm font-semibold text-text-main">Select a submission to review</div>
              <div className="text-xs">Click on a pending submission from the left panel</div>
            </div>
          ) : (
            <>
              <div className="mb-5 pb-4 border-b border-line">
                <div className="text-base font-bold text-navy mb-1">{selected.studentName}</div>
                <div className="text-[13px] text-text-muted">
                  {selected.courseCode} · {selected.quizTitle}
                </div>
              </div>

              <div className="mb-[18px]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                  <IconQuestionMark size={13} /> Question
                </div>
                <div className="text-sm text-text-main leading-[1.7] px-3.5 py-3 bg-bg-page rounded-[6px]">
                  {selected.questionText}
                </div>
              </div>

              <div className="mb-[18px]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                  <IconMessage2 size={13} /> Student Response
                </div>
                <div className="text-[13px] text-text-main leading-[1.7] px-3.5 py-3 bg-[#f8fbff] border border-badge-blue-bg rounded-[6px] whitespace-pre-wrap">
                  {selected.textAnswer || <span className="text-text-muted italic">No answer submitted.</span>}
                </div>
              </div>

              <div className="mb-[18px]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                  <IconRobot size={13} /> AI Score &amp; Justification
                </div>
                {selected.aiDraftScore !== null && selected.aiDraftScore !== undefined ? (
                  <div className="text-xs text-badge-amber-text leading-[1.6] px-3 py-2.5 bg-badge-amber-bg rounded-[6px] border-l-[3px] border-l-[#e8a020]">
                    {selected.aiDraftJustification}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">No AI draft yet (still drafting, or drafting failed) — grade manually below.</p>
                )}
              </div>

              <div className="flex items-center gap-3 px-4 py-3.5 bg-bg-page rounded-[6px] mb-4">
                <div className="text-[13px] text-text-muted">Final Score:</div>
                <input
                  type="number"
                  min="0"
                  max={selected.maxScore}
                  className={`w-20 text-center text-base font-bold ${inputClass}`}
                  value={scoreValue}
                  onChange={(e) => updateDraft(selected._id, { score: e.target.value })}
                />
                <div className="text-[13px] text-text-muted">/ {selected.maxScore}</div>
              </div>

              <textarea
                placeholder="Feedback (optional)"
                rows={2}
                className={`w-full mb-4 ${inputClass}`}
                value={feedbackValue}
                onChange={(e) => updateDraft(selected._id, { feedback: e.target.value })}
              />

              <Button onClick={() => handleGrade(selected)} disabled={savingId === selected._id || scoreValue === ""}>
                <IconCircleCheck size={16} />
                {savingId === selected._id ? "Saving…" : "Approve Grade"}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
