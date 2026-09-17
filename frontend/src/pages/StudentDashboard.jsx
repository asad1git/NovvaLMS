import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import StudentCourses from "./StudentCourses";
import ChatBot from "./ChatBot";
import MyResults from "./MyResults";
import Analytics from "./Analytics";
import StudentOverview from "./StudentOverview";
import AccountSettings from "./AccountSettings";
import Attendance from "./Attendance";
import Transcript from "./Transcript";
import Register from "./Register";
import DegreeAudit from "./DegreeAudit";

const NAV_ITEMS = [
  "Dashboard",
  "Register",
  "My Courses",
  "My Results",
  "Analytics",
  "Attendance",
  "Transcript",
  "Degree Audit",
  "Novva Assistant",
  "Account Settings",
];

export default function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Student" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Register" ? (
        <Register />
      ) : activeNav === "My Courses" ? (
        <StudentCourses />
      ) : activeNav === "Novva Assistant" ? (
        <ChatBot />
      ) : activeNav === "My Results" ? (
        <MyResults />
      ) : activeNav === "Analytics" ? (
        <Analytics />
      ) : activeNav === "Attendance" ? (
        <Attendance />
      ) : activeNav === "Transcript" ? (
        <Transcript />
      ) : activeNav === "Degree Audit" ? (
        <DegreeAudit />
      ) : activeNav === "Account Settings" ? (
        <AccountSettings />
      ) : (
        <StudentOverview onNavigate={setActiveNav} />
      )}
    </DashboardShell>
  );
}
