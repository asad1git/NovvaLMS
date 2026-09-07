import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";

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
    <div className="flex h-screen bg-bg-page text-sm">
      {/* Sidebar */}
      <aside className="w-52 bg-navy flex flex-col flex-shrink-0">
        <div className="px-4 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/15 rounded-md flex items-center justify-center text-white text-sm shadow-sm">
              🎓
            </div>
            <span className="text-white text-sm font-medium tracking-tight">Novva LMS</span>
          </div>
          <div className="text-[10px] text-white/50 mt-1">{role} Panel</div>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map((item, i) => {
            const isActive = activeNav ? activeNav === item : i === 0;
            return (
              <div
                key={item}
                onClick={() => onNavClick?.(item)}
                className={`px-3 py-2 text-xs rounded-md cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "bg-white/12 text-white shadow-sm"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 py-3 px-2">
          <div
            onClick={handleLogout}
            className="px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-md cursor-pointer transition-colors duration-150"
          >
            Logout
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <span className="text-sm font-medium text-gray-900">{activeNav || "Dashboard Overview"}</span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-xs text-gray-500">{auth?.name}</span>
            <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-navy/10">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
