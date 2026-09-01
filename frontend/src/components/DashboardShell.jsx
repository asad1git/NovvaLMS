import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
            <div className="w-7 h-7 bg-white/15 rounded-md flex items-center justify-center text-white text-sm">
              🎓
            </div>
            <span className="text-white text-sm font-medium">Novva LMS</span>
          </div>
          <div className="text-[10px] text-white/50 mt-1">{role} Panel</div>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map((item, i) => {
            const isActive = activeNav ? activeNav === item : i === 0;
            return (
              <div
                key={item}
                onClick={() => onNavClick?.(item)}
                className={`px-4 py-2 text-xs cursor-pointer ${
                  isActive
                    ? "bg-white/10 text-white border-l-2 border-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 py-3">
          <div
            onClick={handleLogout}
            className="px-4 py-2 text-xs text-white/60 hover:text-white cursor-pointer"
          >
            Logout
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-medium text-gray-900">{activeNav || "Dashboard Overview"}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{auth?.name}</span>
            <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-[10px] font-medium">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
