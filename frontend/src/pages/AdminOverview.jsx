import { useEffect, useState } from "react";
import { listUsers } from "../api/users";
import { listCourses } from "../api/courses";
import { listFeeChallans } from "../api/finance";
import { StatCard, Card, EmptyState, LoadingState } from "../components/ui";

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [students, teachers, courseList, challans] = await Promise.all([
          listUsers("student"),
          listUsers("teacher"),
          listCourses(),
          listFeeChallans(),
        ]);
        setStats({
          students: students.length,
          teachers: teachers.length,
          courses: courseList.length,
          unpaidChallans: challans.filter((c) => c.status !== "paid").length,
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
        <StatCard label="Students" value={stats.students} icon="🎓" />
        <StatCard label="Teachers" value={stats.teachers} icon="🧑‍🏫" />
        <StatCard label="Courses" value={stats.courses} icon="📚" />
        <StatCard label="Unpaid Challans" value={stats.unpaidChallans} accent={stats.unpaidChallans > 0} icon="💳" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Recent Courses</h2>
          <button onClick={() => onNavigate?.("Manage Courses")} className="text-xs text-navy-light hover:underline">
            View all
          </button>
        </div>
        {courses.length === 0 ? (
          <EmptyState icon="📚" title="No courses created yet" subtitle="Courses created by admins will show up here." />
        ) : (
          <div className="space-y-1">
            {courses.map((c) => (
              <div key={c._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <div>
                  <span className="text-gray-900 font-medium">{c.code ? `${c.code} — ` : ""}{c.title}</span>
                </div>
                <span className="text-gray-500">{c.teacher?.name || "Unassigned"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-3 flex-wrap">
        <QuickLink label="Manage Users" onClick={() => onNavigate?.("Manage Users")} />
        <QuickLink label="Manage Courses" onClick={() => onNavigate?.("Manage Courses")} />
        <QuickLink label="Parent Links" onClick={() => onNavigate?.("Parent Links")} />
        <QuickLink label="Fee Challans" onClick={() => onNavigate?.("Fee Challans")} />
        <QuickLink label="Salary Slips" onClick={() => onNavigate?.("Salary Slips")} />
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
