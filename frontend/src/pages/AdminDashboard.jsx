import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AdminCourses from "./AdminCourses";
import AdminUsers from "./AdminUsers";
import AdminFeeChallans from "./AdminFeeChallans";
import AdminSalarySlips from "./AdminSalarySlips";
import AdminOverview from "./AdminOverview";
import AccountSettings from "./AccountSettings";
import AdminParentLinks from "./AdminParentLinks";

const NAV_ITEMS = [
  "Dashboard",
  "Manage Users",
  "Manage Courses",
  "Parent Links",
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
      ) : activeNav === "Parent Links" ? (
        <AdminParentLinks />
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
