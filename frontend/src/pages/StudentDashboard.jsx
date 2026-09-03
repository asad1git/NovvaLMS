import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import StudentCourses from "./StudentCourses";
import ChatBot from "./ChatBot";
import MyResults from "./MyResults";
import Analytics from "./Analytics";

const NAV_ITEMS = ["Dashboard", "My Courses", "My Results", "Analytics", "AI Chatbot"];

export default function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Student" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <StudentCourses />
      ) : activeNav === "AI Chatbot" ? (
        <ChatBot />
      ) : activeNav === "My Results" ? (
        <MyResults />
      ) : activeNav === "Analytics" ? (
        <Analytics />
      ) : (
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Everything is live.</p>
          <p>
            Click "My Courses" for materials and quizzes, "My Results" for your quiz scores,
            "Analytics" for your weak-topic breakdown, or "AI Chatbot" for course Q&amp;A.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
