import { useEffect, useState } from "react";
import { getMyAnalytics } from "../api/analytics";

function scoreBadgeClass(pct) {
  if (pct === null) return "bg-gray-100 text-gray-500";
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

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-card p-5">
      <h2 className="text-sm font-medium text-gray-900 mb-3">My Quiz Results ({attempts.length})</h2>
      {error && <p className="text-xs text-badge-red-text mb-2">{error}</p>}
      {attempts.length === 0 && <p className="text-xs text-gray-500">You haven't submitted any quizzes yet.</p>}
      <div className="space-y-1">
        {attempts.map((r) => (
          <div key={r.attemptId} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
            <div>
              <div className="text-gray-900 font-medium">{r.quizTitle}</div>
              <div className="text-[11px] text-gray-500">
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
    </div>
  );
}
