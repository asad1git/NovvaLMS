import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AdminCourses from "./AdminCourses";
import AccountSettings from "./AccountSettings";

// A Registrar owns terms, offerings, and registration rules — the same
// Terms/Catalog/Offerings/Roster surface AdminCourses already provides,
// reused directly rather than duplicated. The backend already authorizes
// "registrar" on every endpoint that page calls (createTerm, createCourse,
// createOffering, bulkEnrollFromCSV, getEnrollments), so no admin-only
// action silently 403s here. Deliberately no Users/Fee/Salary/Parent-or-
// Advisor-Links access — those stay out of a Registrar's scope.
const NAV_ITEMS = ["Manage Courses", "Account Settings"];

export default function RegistrarDashboard() {
  const [activeNav, setActiveNav] = useState("Manage Courses");

  return (
    <DashboardShell role="Registrar" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Account Settings" ? <AccountSettings /> : <AdminCourses />}
    </DashboardShell>
  );
}
