import { useEffect, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AccountSettings from "./AccountSettings";
import { getMyChildren, getChildAnalytics } from "../api/parentLinks";

const NAV_ITEMS = ["Dashboard", "Account Settings"];

function scoreBadgeClass(pct) {
  if (pct === null) return "bg-gray-100 text-gray-500";
  if (pct >= 80) return "bg-badge-green-bg text-badge-green-text";
  if (pct >= 50) return "bg-badge-blue-bg text-badge-blue-text";
  return "bg-badge-red-bg text-badge-red-text";
}

function barColor(pct) {
  if (pct >= 80) return "bg-badge-green-text";
  if (pct >= 60) return "bg-badge-blue-text";
  return "bg-badge-red-text";
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-5">
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-badge-red-text" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function ChildAnalytics({ child, analytics }) {
  const { attempts, topics, overall } = analytics;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Quizzes Taken" value={overall.totalAttempts} />
        <StatCard
          label="Average Score"
          value={overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"}
        />
        <StatCard label="Weak Topics" value={overall.weakTopics.length} accent={overall.weakTopics.length > 0} />
      </div>

      {overall.weakTopics.length > 0 && (
        <div className="bg-badge-red-bg border border-badge-red-text/20 rounded-card p-5">
          <h2 className="text-sm font-medium text-badge-red-text mb-2">
            {child.name} is scoring below 60% on these topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {overall.weakTopics.map((t) => (
              <span key={t.topic} className="text-xs font-medium bg-white text-badge-red-text px-3 py-1 rounded">
                {t.topic} — {t.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Quiz Results ({attempts.length})</h2>
        {attempts.length === 0 && <p className="text-xs text-gray-500">No submitted quizzes yet.</p>}
        <div className="space-y-1">
          {attempts.map((r) => (
            <div key={r.attemptId} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
              <div>
                <div className="text-gray-900 font-medium">{r.quizTitle}</div>
                <div className="text-[11px] text-gray-500">
                  {r.courseTitle} · submitted {new Date(r.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!r.gradingComplete && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-badge-amber-bg text-badge-amber-text">
                    Awaiting review
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${scoreBadgeClass(r.percentage)}`}>
                  {r.score}/{r.maxScore ?? "?"}
                  {r.percentage !== null ? ` (${r.percentage}%)` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Performance by Topic</h2>
        {topics.length === 0 && (
          <p className="text-xs text-gray-500">No graded questions yet — topic breakdown appears once scored.</p>
        )}
        <div className="space-y-3">
          {topics.map((t) => (
            <div key={t.topic}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-900 font-medium">{t.topic}</span>
                <span className="text-gray-500">
                  {t.pointsEarned}/{t.pointsPossible} ({t.percentage}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded">
                <div
                  className={`h-1.5 rounded ${barColor(t.percentage)}`}
                  style={{ width: `${Math.min(100, t.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParentOverview() {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyChildren()
      .then((list) => {
        setChildren(list);
        if (list.length > 0) setSelectedId(list[0]._id);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load your children"))
      .finally(() => setLoadingChildren(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingAnalytics(true);
    setError("");
    getChildAnalytics(selectedId)
      .then(setAnalytics)
      .catch((err) => setError(err.response?.data?.message || "Failed to load analytics"))
      .finally(() => setLoadingAnalytics(false));
  }, [selectedId]);

  if (loadingChildren) return <p className="text-sm text-gray-500">Loading…</p>;

  if (children.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-card p-5 text-xs text-gray-500">
        No students are linked to your account yet. Contact your institution's admin to get
        linked to your child's account.
      </div>
    );
  }

  const selectedChild = children.find((c) => c._id === selectedId);

  return (
    <div className="space-y-4">
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedId(c._id)}
              className={`text-xs font-medium px-4 py-2 rounded-card border ${
                c._id === selectedId
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-gray-700 border-gray-200 hover:border-navy-light"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-badge-red-text">{error}</p>}

      {loadingAnalytics || !analytics ? (
        <p className="text-sm text-gray-500">Loading {selectedChild?.name}'s progress…</p>
      ) : (
        <ChildAnalytics child={selectedChild} analytics={analytics} />
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <DashboardShell role="Parent" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Account Settings" ? <AccountSettings /> : <ParentOverview />}
    </DashboardShell>
  );
}
