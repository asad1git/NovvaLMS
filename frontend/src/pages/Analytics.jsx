import { useEffect, useState } from "react";
import { getMyAnalytics } from "../api/analytics";
import { StatCard, Card, EmptyState, LoadingState } from "../components/ui";

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

  if (loading) return <LoadingState />;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  const { topics, overall } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Quizzes Submitted" value={overall.totalAttempts} icon="📝" />
        <StatCard
          label="Average Score"
          value={overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"}
          icon="📊"
        />
        <StatCard label="Weak Topics" value={overall.weakTopics.length} accent={overall.weakTopics.length > 0} icon="⚠️" />
      </div>

      {overall.weakTopics.length > 0 && (
        <Card variant="danger">
          <h2 className="text-sm font-medium text-badge-red-text mb-2">Focus on these topics</h2>
          <p className="text-xs text-badge-red-text/80 mb-3">
            You're scoring below 60% on these — review the related lecture material or ask the
            AI chatbot for help.
          </p>
          <div className="flex flex-wrap gap-2">
            {overall.weakTopics.map((t) => (
              <span key={t.topic} className="text-xs font-medium bg-white text-badge-red-text px-3 py-1 rounded shadow-sm">
                {t.topic} — {t.percentage}%
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Performance by Topic</h2>
        {topics.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No topic analytics yet"
            subtitle="This appears once your quizzes are scored."
          />
        ) : (
          <div className="space-y-3">
            {topics.map((t) => (
              <div key={t.topic}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-900 font-medium">{t.topic}</span>
                  <span className="text-gray-500">
                    {t.pointsEarned}/{t.pointsPossible} ({t.percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`h-1.5 rounded transition-[width] duration-500 ease-out ${barColor(t.percentage)}`}
                    style={{ width: `${Math.min(100, t.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
