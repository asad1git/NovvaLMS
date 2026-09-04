import { useEffect, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AccountSettings from "./AccountSettings";
import { getMyChildren } from "../api/parentLinks";

const NAV_ITEMS = ["Dashboard", "Account Settings"];

function MyChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyChildren()
      .then(setChildren)
      .catch((err) => setError(err.response?.data?.message || "Failed to load your children"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-card p-5">
      <h2 className="text-sm font-medium text-gray-900 mb-3">My Children ({children.length})</h2>
      {children.length === 0 && (
        <p className="text-xs text-gray-500">
          No students are linked to your account yet. Contact your institution's admin to get
          linked to your child's account.
        </p>
      )}
      <div className="space-y-1">
        {children.map((c) => (
          <div key={c._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
            <div>
              <div className="text-gray-900 font-medium">{c.name}</div>
              <div className="text-[11px] text-gray-400">{c.email}</div>
            </div>
          </div>
        ))}
      </div>
      {children.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-3">
          Performance analytics and the AI chatbot for your child's progress are coming soon.
        </p>
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Parent" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Account Settings" ? <AccountSettings /> : <MyChildren />}
    </DashboardShell>
  );
}
