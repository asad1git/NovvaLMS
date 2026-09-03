import { useEffect, useState } from "react";
import { getMyAnalytics } from "../api/analytics";

function barColor(pct) {
  if (pct >= 80) return "bg-badge-green-text";
  if (pct >= 60) return "bg-badge-blue-text";
  return "bg-badge-red-text";
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setData(await getMyAnalytics());
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  const { topics, overall } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <p className="text-[11px] text-gray-500 mb-1">Quizzes Submitted</p>
          <p className="text-2xl font-semibold text-gray-900">{overall.totalAttempts}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <p className="text-[11px] text-gray-500 mb-1">Average Score</p>
          <p className="text-2xl font-semibold text-gray-900">
            {overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <p className="text-[11px] text-gray-500 mb-1">Weak Topics</p>
          <p className="text-2xl font-semibold text-gray-900">{overall.weakTopics.length}</p>
        </div>
      </div>

      {overall.weakTopics.length > 0 && (
        <div className="bg-badge-red-bg border border-badge-red-text/20 rounded-card p-5">
          <h2 className="text-sm font-medium text-badge-red-text mb-2">Focus on these topics</h2>
          <p className="text-xs text-badge-red-text/80 mb-3">
            You're scoring below 60% on these — review the related lecture material or ask the
            AI chatbot for help.
          </p>
          <div className="flex flex-wrap gap-2">
            {overall.weakTopics.map((t) => (
              <span key={t.topic} className="text-xs font-medium bg-white text-badge-red-text px-3 py-1 rounded">
                {t.topic} — {t.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Performance by Topic</h2>
        {topics.length === 0 && (
          <p className="text-xs text-gray-500">
            No graded questions yet — topic analytics appear once your quizzes are scored.
          </p>
        )}
        <div className="space-y-3">
          {topics.map((t) => (
            <div key={t.topic}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-900 font-medium">{t.topic}</span>
                <span className="text-gray-500">
                  {t.pointsEarned}/{t.pointsPossible} ({t.percentage}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded">
                <div
                  className={`h-1.5 rounded ${barColor(t.percentage)}`}
                  style={{ width: `${Math.min(100, t.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
