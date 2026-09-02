import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import TeacherCourses from "./TeacherCourses";
import GradeApprovals from "./GradeApprovals";

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
        <div className="bg-white border border-gray-200 rounded-card p-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Sprint 3 checkpoint: Materials, quizzes, and grading are live.</p>
          <p>
            Click "My Courses" to upload lecture materials and build quizzes (MCQ or
            subjective), or "Grade Approvals" to review pending subjective answers. AI
            quiz generation (US-05) and the RAG Engine ship in Sprint 4-5.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
