import { useEffect, useState } from "react";
import { IconBooks, IconFileCheck, IconChartLine, IconAlertTriangle } from "@tabler/icons-react";
import { listCourses } from "../api/courses";
import { getMyAnalytics } from "../api/analytics";
import { StatCard, Card, Button, EmptyState, LoadingState } from "../components/ui";

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
  const recent = attempts.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Enrolled Courses" value={courses.length} icon={IconBooks} tone="blue" />
        <StatCard label="Quizzes Taken" value={overall.totalAttempts} icon={IconFileCheck} tone="success" />
        <StatCard
          label="Average Score"
          value={overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"}
          icon={IconChartLine}
          tone="navy"
        />
        <StatCard
          label="Weak Topics"
          value={overall.weakTopics.length}
          icon={IconAlertTriangle}
          tone={overall.weakTopics.length > 0 ? "danger" : "success"}
        />
      </div>

      {overall.weakTopics.length > 0 && (
        <Card variant="danger">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-badge-red-text">Topics to review</h2>
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

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[13px] font-semibold text-text-main">My Courses</h2>
            <Button variant="secondary" size="sm" onClick={() => onNavigate?.("My Courses")}>
              View All
            </Button>
          </div>
          {courses.length === 0 ? (
            <EmptyState icon="📚" title="Not enrolled in any courses yet" />
          ) : (
            <div className="space-y-1">
              {courses.slice(0, 5).map((c) => (
                <div key={c._id} className="flex items-center justify-between text-xs border-b border-line/60 last:border-b-0 py-2.5">
                  <span className="font-semibold text-text-main">{c.code} — {c.title}</span>
                  <span className="text-text-muted">{c.teacher?.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[13px] font-semibold text-text-main">Recent Results</h2>
            <Button variant="secondary" size="sm" onClick={() => onNavigate?.("My Results")}>
              View All
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="📝" title="No quizzes submitted yet" />
          ) : (
            <div className="space-y-1">
              {recent.map((r) => (
                <div key={r.attemptId} className="flex items-center justify-between text-xs border-b border-line/60 last:border-b-0 py-2.5">
                  <span className="font-semibold text-text-main">{r.quizTitle}</span>
                  <span className="text-text-muted">
                    {r.score}/{r.maxScore ?? "?"}
                    {r.percentage !== null ? ` (${r.percentage}%)` : " (pending)"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
