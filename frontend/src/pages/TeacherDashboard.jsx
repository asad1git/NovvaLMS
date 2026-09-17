import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import TeacherCourses from "./TeacherCourses";
import GradeApprovals from "./GradeApprovals";
import TeacherOverview from "./TeacherOverview";
import AccountSettings from "./AccountSettings";

const NAV_ITEMS = ["Dashboard", "My Courses", "Grade Approvals", "Account Settings"];

export default function TeacherDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [openCourseId, setOpenCourseId] = useState(null);

  function handleOpenCourse(courseId) {
    setOpenCourseId(courseId);
    setActiveNav("My Courses");
  }

  return (
    <DashboardShell role="Teacher" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <TeacherCourses initialCourseId={openCourseId} onCourseOpened={() => setOpenCourseId(null)} />
      ) : activeNav === "Grade Approvals" ? (
        <GradeApprovals />
      ) : activeNav === "Account Settings" ? (
        <AccountSettings />
      ) : (
        <TeacherOverview onNavigate={setActiveNav} onOpenCourse={handleOpenCourse} />
      )}
    </DashboardShell>
  );
}
