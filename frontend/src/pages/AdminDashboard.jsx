import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AdminCourses from "./AdminCourses";
import AdminUsers from "./AdminUsers";
import AdminFeeChallans from "./AdminFeeChallans";
import AdminSalarySlips from "./AdminSalarySlips";
import AdminOverview from "./AdminOverview";

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
        <AdminOverview onNavigate={setActiveNav} />
      )}
    </DashboardShell>
  );
}
