import { useEffect, useState } from "react";
import { listCourses } from "../api/courses";
import { getMyAnalytics } from "../api/analytics";
import { StatCard, Card, EmptyState, LoadingState } from "../components/ui";

export default function StudentOverview({ onNavigate }) {
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [courseList, data] = await Promise.all([listCourses(), getMyAnalytics()]);
        setCourses(courseList);
        setAnalytics(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  const { overall, attempts } = analytics;
  const recent = attempts.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Enrolled Courses" value={courses.length} icon="📚" />
        <StatCard label="Quizzes Taken" value={overall.totalAttempts} icon="📝" />
        <StatCard
          label="Average Score"
          value={overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"}
          icon="📊"
        />
        <StatCard label="Weak Topics" value={overall.weakTopics.length} accent={overall.weakTopics.length > 0} icon="⚠️" />
      </div>

      {overall.weakTopics.length > 0 && (
        <Card variant="danger">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-badge-red-text">Topics to review</h2>
            <button onClick={() => onNavigate?.("Analytics")} className="text-xs text-badge-red-text hover:underline">
              View Analytics
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {overall.weakTopics.map((t) => (
              <span key={t.topic} className="text-xs font-medium bg-white text-badge-red-text px-3 py-1 rounded shadow-sm">
                {t.topic} — {t.percentage}%
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Recent Results</h2>
          <button onClick={() => onNavigate?.("My Results")} className="text-xs text-navy-light hover:underline">
            View all
          </button>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon="📝" title="No quizzes submitted yet" subtitle="Your recent quiz results will show up here." />
        ) : (
          <div className="space-y-1">
            {recent.map((r) => (
              <div key={r.attemptId} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <span className="text-gray-900 font-medium">{r.quizTitle}</span>
                <span className="text-gray-500">
                  {r.score}/{r.maxScore ?? "?"}
                  {r.percentage !== null ? ` (${r.percentage}%)` : " (pending)"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <QuickLink label="My Courses" onClick={() => onNavigate?.("My Courses")} />
        <QuickLink label="Novva Assistant" onClick={() => onNavigate?.("Novva Assistant")} />
        <QuickLink label="Analytics" onClick={() => onNavigate?.("Analytics")} />
      </div>
    </div>
  );
}

function QuickLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 bg-white border border-gray-200 rounded-card shadow-card px-4 py-3 text-xs font-medium text-navy hover:border-navy-light hover:shadow-card-hover transition-all duration-150 text-left"
    >
      {label} →
    </button>
  );
}
