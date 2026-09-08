import { useEffect, useState } from "react";
import {
  IconCertificate,
  IconSchool,
  IconBooks,
  IconCreditCard,
  IconUserPlus,
  IconLink,
  IconReceipt,
  IconFileInvoice,
} from "@tabler/icons-react";
import { listUsers } from "../api/users";
import { listCourses } from "../api/courses";
import { listFeeChallans } from "../api/finance";
import { StatCard, Card, Button, EmptyState, LoadingState } from "../components/ui";

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
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Students" value={stats.students} icon={IconCertificate} tone="amber" />
        <StatCard label="Teachers" value={stats.teachers} icon={IconSchool} tone="navy" />
        <StatCard label="Courses" value={stats.courses} icon={IconBooks} tone="success" />
        <StatCard
          label="Unpaid Challans"
          value={stats.unpaidChallans}
          icon={IconCreditCard}
          tone={stats.unpaidChallans > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[13px] font-semibold text-text-main">Recent Courses</h2>
            <Button variant="secondary" size="sm" onClick={() => onNavigate?.("Manage Courses")}>
              View All
            </Button>
          </div>
          {courses.length === 0 ? (
            <EmptyState icon="📚" title="No courses created yet" subtitle="Courses created by admins will show up here." />
          ) : (
            <div className="space-y-1">
              {courses.map((c) => (
                <div key={c._id} className="flex items-center justify-between text-xs border-b border-line/60 last:border-b-0 py-2.5">
                  <span className="font-semibold text-text-main">{c.code ? `${c.code} — ` : ""}{c.title}</span>
                  <span className="text-text-muted">{c.teacher?.name || "Unassigned"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-[13px] font-semibold text-text-main mb-3.5">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <QuickAction
              icon={IconUserPlus}
              label="Manage Users"
              sub="Create admin, teacher, or student accounts"
              onClick={() => onNavigate?.("Manage Users")}
            />
            <QuickAction
              icon={IconLink}
              label="Parent Links"
              sub="Link a parent account to a student"
              onClick={() => onNavigate?.("Parent Links")}
            />
            <QuickAction
              icon={IconReceipt}
              label="Fee Challans"
              sub="Generate a fee challan for a student"
              onClick={() => onNavigate?.("Fee Challans")}
            />
            <QuickAction
              icon={IconFileInvoice}
              label="Salary Slips"
              sub="Generate a teacher pay slip"
              onClick={() => onNavigate?.("Salary Slips")}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 px-3.5 py-[11px] rounded-[6px] border-[1.5px] border-line bg-white text-left w-full transition-colors duration-150 hover:border-navy-light hover:bg-badge-blue-bg"
    >
      <Icon size={18} stroke={1.8} className="flex-shrink-0 text-text-muted group-hover:text-navy-light transition-colors duration-150" />
      <div>
        <div className="text-[13px] font-medium text-text-main">{label}</div>
        <div className="text-[11px] text-text-muted">{sub}</div>
      </div>
    </button>
  );
}
