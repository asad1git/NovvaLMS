import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import TeacherCourses from "./TeacherCourses";

const NAV_ITEMS = ["Dashboard", "My Courses", "Grade Approvals"];

export default function TeacherDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Teacher" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "My Courses" ? (
        <TeacherCourses />
      ) : (
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Sprint 3 checkpoint: Lecture material upload is live.</p>
          <p>
            Click "My Courses" to upload lecture materials (PDF/PPTX/DOCX). AI quiz
            generation (US-05) and the RAG Engine ship in Sprint 4–5. HITL grade
            review (US-06) ships in Sprint 6.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
