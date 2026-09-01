import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AdminCourses from "./AdminCourses";

const NAV_ITEMS = ["Dashboard", "Manage Users", "Manage Courses", "Fee Challans", "Salary Slips"];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Administrator" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Manage Courses" ? (
        <AdminCourses />
      ) : (
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Sprint 3 checkpoint: Course management is live.</p>
          <p>
            Click "Manage Courses" to create courses and bulk-enroll students via CSV.
            User management and financial modules (US-01, US-09, US-10) are built in
            Sprint 2 and Sprint 8.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
