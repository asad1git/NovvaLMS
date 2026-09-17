import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AdminCourses from "./AdminCourses";
import AdminUsers from "./AdminUsers";
import AdminFeeChallans from "./AdminFeeChallans";
import AdminSalarySlips from "./AdminSalarySlips";
import AdminOverview from "./AdminOverview";
import AccountSettings from "./AccountSettings";
import AdminParentLinks from "./AdminParentLinks";
import AdminAdvisorLinks from "./AdminAdvisorLinks";
import AdminDepartments from "./AdminDepartments";

const NAV_ITEMS = [
  "Dashboard",
  "Manage Users",
  "Manage Courses",
  "Departments",
  "Parent Links",
  "Advisor Links",
  "Fee Challans",
  "Salary Slips",
  "Account Settings",
];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Administrator" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Manage Courses" ? (
        <AdminCourses />
      ) : activeNav === "Manage Users" ? (
        <AdminUsers />
      ) : activeNav === "Departments" ? (
        <AdminDepartments />
      ) : activeNav === "Parent Links" ? (
        <AdminParentLinks />
      ) : activeNav === "Advisor Links" ? (
        <AdminAdvisorLinks />
      ) : activeNav === "Fee Challans" ? (
        <AdminFeeChallans />
      ) : activeNav === "Salary Slips" ? (
        <AdminSalarySlips />
      ) : activeNav === "Account Settings" ? (
        <AccountSettings />
      ) : (
        <AdminOverview onNavigate={setActiveNav} />
      )}
    </DashboardShell>
  );
}
