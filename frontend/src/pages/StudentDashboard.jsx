import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import StudentCourses from "./StudentCourses";
import ChatBot from "./ChatBot";
import MyResults from "./MyResults";
import Analytics from "./Analytics";
import StudentOverview from "./StudentOverview";
import AccountSettings from "./AccountSettings";

const NAV_ITEMS = ["Dashboard", "My Courses", "My Results", "Analytics", "Novva Assistant", "Account Settings"];

export default function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Student" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <StudentCourses />
      ) : activeNav === "Novva Assistant" ? (
        <ChatBot />
      ) : activeNav === "My Results" ? (
        <MyResults />
      ) : activeNav === "Analytics" ? (
        <Analytics />
      ) : activeNav === "Account Settings" ? (
        <AccountSettings />
      ) : (
        <StudentOverview onNavigate={setActiveNav} />
      )}
    </DashboardShell>
  );
}
