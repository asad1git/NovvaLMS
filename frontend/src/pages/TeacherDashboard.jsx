import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import TeacherCourses from "./TeacherCourses";
import GradeApprovals from "./GradeApprovals";
import TeacherOverview from "./TeacherOverview";

const NAV_ITEMS = ["Dashboard", "My Courses", "Grade Approvals"];

export default function TeacherDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Teacher" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <TeacherCourses />
      ) : activeNav === "Grade Approvals" ? (
        <GradeApprovals />
      ) : (
        <TeacherOverview onNavigate={setActiveNav} />
      )}
    </DashboardShell>
  );
}
