import { useEffect, useState } from "react";
import { IconBooks, IconUsers, IconFileCheck, IconClockExclamation } from "@tabler/icons-react";
import { listCourses, getEnrollments } from "../api/courses";
import { listQuizzesForCourse, getPendingGrades } from "../api/quizzes";
import { StatCard, Card, EmptyState, LoadingState } from "../components/ui";

export default function TeacherOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [courseList, pending] = await Promise.all([listCourses(), getPendingGrades()]);
        const [enrollmentCounts, quizCounts] = await Promise.all([
          Promise.all(courseList.map((c) => getEnrollments(c._id).then((e) => e.length).catch(() => 0))),
          Promise.all(courseList.map((c) => listQuizzesForCourse(c._id).then((q) => q.length).catch(() => 0))),
        ]);
        setStats({
          courses: courseList.length,
          students: enrollmentCounts.reduce((a, b) => a + b, 0),
          quizzes: quizCounts.reduce((a, b) => a + b, 0),
          pendingGrades: pending.length,
        });
        setCourses(courseList.slice(0, 5));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="My Courses" value={stats.courses} icon={IconBooks} tone="blue" />
        <StatCard label="Enrolled Students" value={stats.students} icon={IconUsers} tone="navy" />
        <StatCard label="Quizzes Created" value={stats.quizzes} icon={IconFileCheck} tone="success" />
        <StatCard
          label="Pending Grades"
          value={stats.pendingGrades}
          icon={IconClockExclamation}
          tone={stats.pendingGrades > 0 ? "amber" : "success"}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">My Courses</h2>
          <button onClick={() => onNavigate?.("My Courses")} className="text-xs text-navy-light hover:underline">
            View all
          </button>
        </div>
        {courses.length === 0 ? (
          <EmptyState icon="📚" title="No courses assigned yet" subtitle="Courses you're assigned to teach will show up here." />
        ) : (
          <div className="space-y-1">
            {courses.map((c) => (
              <div key={c._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <span className="text-gray-900 font-medium">{c.code ? `${c.code} — ` : ""}{c.title}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <QuickLink label="My Courses" onClick={() => onNavigate?.("My Courses")} />
        <QuickLink label="Grade Approvals" onClick={() => onNavigate?.("Grade Approvals")} accent={stats.pendingGrades > 0} />
      </div>
    </div>
  );
}

function QuickLink({ label, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 bg-white border rounded-card shadow-card px-4 py-3 text-xs font-medium text-left transition-all duration-150 hover:shadow-card-hover ${
        accent ? "border-badge-red-text/40 text-badge-red-text" : "border-gray-200 text-navy hover:border-navy-light"
      }`}
    >
      {label} →
    </button>
  );
}
