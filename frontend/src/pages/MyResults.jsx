import { useEffect, useState } from "react";
import { IconNotes } from "@tabler/icons-react";
import { getMyAnalytics } from "../api/analytics";
import { Card, EmptyState, LoadingState } from "../components/ui";

function scoreBadgeClass(pct) {
  if (pct === null) return "bg-bg-page text-text-muted";
  if (pct >= 80) return "bg-badge-green-bg text-badge-green-text";
  if (pct >= 50) return "bg-badge-blue-bg text-badge-blue-text";
  return "bg-badge-red-bg text-badge-red-text";
}

export default function MyResults() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { attempts } = await getMyAnalytics();
        setAttempts(attempts);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <Card>
      <h2 className="text-sm font-medium text-text-main mb-3">My Quiz Results ({attempts.length})</h2>
      {error && <p className="text-xs text-badge-red-text mb-2">{error}</p>}
      {attempts.length === 0 ? (
        <EmptyState icon={<IconNotes size={32} className="text-text-muted" />} title="No quizzes submitted yet" subtitle="Your quiz results will show up here once you take one." />
      ) : (
        <div className="space-y-1">
          {attempts.map((r) => (
            <div
              key={r.attemptId}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div>
                <div className="text-text-main font-medium">{r.quizTitle}</div>
                <div className="text-[11px] text-text-muted">
                  {r.courseTitle} · submitted {new Date(r.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!r.gradingComplete && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-badge-amber-bg text-badge-amber-text">
                    Awaiting review
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${scoreBadgeClass(r.percentage)}`}>
                  {r.score}/{r.maxScore ?? "?"}
                  {r.percentage !== null ? ` (${r.percentage}%)` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
