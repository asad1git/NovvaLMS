import { useEffect, useState } from "react";
import { listCourses } from "../api/courses";
import { getMyAnalytics } from "../api/analytics";

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

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  const { overall, attempts } = analytics;
  const recent = attempts.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Enrolled Courses" value={courses.length} />
        <StatCard label="Quizzes Taken" value={overall.totalAttempts} />
        <StatCard label="Average Score" value={overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"} />
        <StatCard label="Weak Topics" value={overall.weakTopics.length} accent={overall.weakTopics.length > 0} />
      </div>

      {overall.weakTopics.length > 0 && (
        <div className="bg-badge-red-bg border border-badge-red-text/20 rounded-card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-badge-red-text">Topics to review</h2>
            <button onClick={() => onNavigate?.("Analytics")} className="text-xs text-badge-red-text hover:underline">
              View Analytics
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {overall.weakTopics.map((t) => (
              <span key={t.topic} className="text-xs font-medium bg-white text-badge-red-text px-3 py-1 rounded">
                {t.topic} — {t.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Recent Results</h2>
          <button onClick={() => onNavigate?.("My Results")} className="text-xs text-navy-light hover:underline">
            View all
          </button>
        </div>
        {recent.length === 0 && <p className="text-xs text-gray-500">You haven't submitted any quizzes yet.</p>}
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
      </div>

      <div className="flex gap-3">
        <QuickLink label="My Courses" onClick={() => onNavigate?.("My Courses")} />
        <QuickLink label="Novva Assistant" onClick={() => onNavigate?.("Novva Assistant")} />
        <QuickLink label="Analytics" onClick={() => onNavigate?.("Analytics")} />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-5">
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-badge-red-text" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function QuickLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 bg-white border border-gray-200 rounded-card px-4 py-3 text-xs font-medium text-navy hover:border-navy-light text-left"
    >
      {label} →
    </button>
  );
}
