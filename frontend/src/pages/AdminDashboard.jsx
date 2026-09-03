import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AdminCourses from "./AdminCourses";
import AdminUsers from "./AdminUsers";
import AdminFeeChallans from "./AdminFeeChallans";
import AdminSalarySlips from "./AdminSalarySlips";

const NAV_ITEMS = ["Dashboard", "Manage Users", "Manage Courses", "Fee Challans", "Salary Slips"];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Administrator" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Manage Courses" ? (
        <AdminCourses />
      ) : activeNav === "Manage Users" ? (
        <AdminUsers />
      ) : activeNav === "Fee Challans" ? (
        <AdminFeeChallans />
      ) : activeNav === "Salary Slips" ? (
        <AdminSalarySlips />
      ) : (
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">All admin modules are live.</p>
          <p>
            "Manage Users" creates accounts of any role, "Manage Courses" creates courses and
            bulk-enrolls students via CSV, "Fee Challans" and "Salary Slips" generate downloadable
            PDF documents.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
