import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import StudentCourses from "./StudentCourses";

const NAV_ITEMS = ["Dashboard", "My Courses", "My Results", "Analytics", "AI Chatbot"];

export default function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Student" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <StudentCourses />
      ) : (
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Sprint 3 checkpoint: Course materials are live.</p>
          <p>
            Click "My Courses" to view enrolled courses and download lecture materials.
            Timed quizzes with auto-save (US-08) and the AI chatbot (US-07) ship in
            Sprint 7. Performance analytics (US-11) ships in Sprint 9.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
