import { useEffect, useState } from "react";
import { IconBooks, IconUsers, IconChartBar, IconBuildingBank } from "@tabler/icons-react";
import DashboardShell from "../components/DashboardShell";
import AccountSettings from "./AccountSettings";
import api from "../api/axios";
import { getDepartmentReport } from "../api/departments";
import { Card, StatCard, EmptyState, LoadingState } from "../components/ui";

const NAV_ITEMS = ["Department Report", "Account Settings"];

function DepartmentReport() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/auth/me");
        const departmentId = me.data.data.department;
        if (!departmentId) {
          setError("Your account has no department assigned yet — contact your admin.");
          return;
        }
        setReport(await getDepartmentReport(departmentId));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load department report");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState label="Loading department report…" />;
  if (error) return <Card variant="danger"><p className="text-xs text-badge-red-text">{error}</p></Card>;
  if (!report) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{report.department.name} ({report.department.code})</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Catalog Courses" value={report.courses.length} icon={IconBooks} tone="navy" />
        <StatCard label="Active Offerings" value={report.offerings.length} icon={IconUsers} tone="success" />
        <StatCard
          label="Avg. Finalized Grade"
          value={report.averagePercentage !== null ? `${report.averagePercentage}%` : "—"}
          icon={IconChartBar}
          tone="navy"
        />
      </div>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Offerings ({report.offerings.length})</h2>
        {report.offerings.length === 0 ? (
          <EmptyState icon={<IconBuildingBank size={32} className="text-text-muted" />} title="No offerings in this department yet." />
        ) : (
          <div className="space-y-1">
            {report.offerings.map((o) => (
              <div key={o._id} className="flex items-center justify-between text-xs border-b border-line py-2">
                <div>
                  <div className="text-text-main font-medium">
                    {o.courseCode} — {o.courseTitle} (Sec. {o.sectionLabel})
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {o.termName} · {o.teacherName} · {o.creditHours} credit hours
                  </div>
                </div>
                <span className="text-[11px] text-text-muted">
                  {o.enrolledCount}/{o.capacity} enrolled
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function HodDashboard() {
  const [activeNav, setActiveNav] = useState("Department Report");

  return (
    <DashboardShell role="Department Head" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Account Settings" ? <AccountSettings /> : <DepartmentReport />}
    </DashboardShell>
  );
}
