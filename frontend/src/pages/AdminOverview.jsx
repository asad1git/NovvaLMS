import { useEffect, useState } from "react";
import { listUsers } from "../api/users";
import { listCourses } from "../api/courses";
import { listFeeChallans } from "../api/finance";

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

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Students" value={stats.students} />
        <StatCard label="Teachers" value={stats.teachers} />
        <StatCard label="Courses" value={stats.courses} />
        <StatCard label="Unpaid Challans" value={stats.unpaidChallans} accent={stats.unpaidChallans > 0} />
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Recent Courses</h2>
          <button onClick={() => onNavigate?.("Manage Courses")} className="text-xs text-navy-light hover:underline">
            View all
          </button>
        </div>
        {courses.length === 0 && <p className="text-xs text-gray-500">No courses created yet.</p>}
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
      </div>

      <div className="flex gap-3">
        <QuickLink label="Manage Users" onClick={() => onNavigate?.("Manage Users")} />
        <QuickLink label="Manage Courses" onClick={() => onNavigate?.("Manage Courses")} />
        <QuickLink label="Fee Challans" onClick={() => onNavigate?.("Fee Challans")} />
        <QuickLink label="Salary Slips" onClick={() => onNavigate?.("Salary Slips")} />
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
