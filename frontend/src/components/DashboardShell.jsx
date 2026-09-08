import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  IconLayoutDashboard,
  IconBooks,
  IconChecklist,
  IconSettings,
  IconRobot,
  IconClipboardList,
  IconChartBar,
  IconCalendarStats,
  IconUsers,
  IconLink,
  IconReceipt2,
  IconCash,
  IconLogout,
  IconSchool,
} from "@tabler/icons-react";
import NotificationBell from "./NotificationBell";

// Exact spec from design-system/*.html's .sb-brand / .nav-link / .topbar —
// icon lookup keyed by label so every DashboardShell caller (which only
// ever passed plain label strings) keeps working unchanged.
const NAV_ICONS = {
  Dashboard: IconLayoutDashboard,
  "My Courses": IconBooks,
  "Manage Courses": IconBooks,
  "Grade Approvals": IconChecklist,
  "Manage Users": IconUsers,
  "Parent Links": IconLink,
  "Fee Challans": IconReceipt2,
  "Salary Slips": IconCash,
  "My Results": IconClipboardList,
  Analytics: IconChartBar,
  Attendance: IconCalendarStats,
  "Novva Assistant": IconRobot,
  "AI Assistant": IconRobot,
  "Account Settings": IconSettings,
};

export default function DashboardShell({ role, navItems, activeNav, onNavClick, children }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = (auth?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen bg-bg-page text-sm text-text-main">
      {/* Sidebar */}
      <aside className="w-[200px] min-w-[200px] bg-navy flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-4 border-b border-white/[0.08]">
          <div className="w-9 h-9 bg-navy-light rounded-lg flex items-center justify-center flex-shrink-0">
            <IconSchool size={19} stroke={2} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Novva LMS</div>
            <div className="text-[11px] text-white/[0.42]">{role}</div>
          </div>
        </div>

        <nav className="flex-1 py-2.5">
          {navItems.map((item, i) => {
            const isActive = activeNav ? activeNav === item : i === 0;
            const Icon = NAV_ICONS[item];
            return (
              <div
                key={item}
                onClick={() => onNavClick?.(item)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium cursor-pointer select-none border-l-[3px] transition-colors duration-150 ${
                  isActive
                    ? "bg-white/10 text-white border-l-navy-light"
                    : "text-white/65 border-l-transparent hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {Icon && <Icon size={17} stroke={1.9} className="flex-shrink-0" />}
                {item}
              </div>
            );
          })}
        </nav>

        <div className="py-2.5 border-t border-white/[0.08]">
          <div
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-white/65 cursor-pointer select-none transition-colors duration-150 hover:bg-[#A32D2D]/20 hover:text-[#ff9999]"
          >
            <IconLogout size={17} stroke={1.9} className="flex-shrink-0" />
            Logout
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[58px] flex-shrink-0 bg-white border-b border-line flex items-center justify-between px-6 shadow-card z-10">
          <span className="text-lg font-bold text-navy">{activeNav || "Dashboard"}</span>
          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <div className="text-right">
              <div className="text-[13px] font-semibold text-text-main leading-tight">{auth?.name}</div>
              <div className="text-[11px] text-text-muted leading-tight">{role}</div>
            </div>
            <div className="w-9 h-9 bg-navy-light rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
