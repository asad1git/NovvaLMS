import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import StudentCourses from "./StudentCourses";
import ChatBot from "./ChatBot";

const NAV_ITEMS = ["Dashboard", "My Courses", "My Results", "Analytics", "AI Chatbot"];

export default function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Student" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <StudentCourses />
      ) : activeNav === "AI Chatbot" ? (
        <ChatBot />
      ) : (
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Sprint 3 checkpoint: Course materials and AI chatbot are live.</p>
          <p>
            Click "My Courses" to view enrolled courses and download lecture materials, or
            "AI Chatbot" to ask questions grounded in your course materials. Performance
            analytics (US-11) ships in Sprint 9.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
