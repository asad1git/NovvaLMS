import { useEffect, useRef, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import AccountSettings from "./AccountSettings";
import { getMyChildren, getChildAnalytics } from "../api/parentLinks";
import { getMessages, sendMessage } from "../api/parentChat";

const NAV_ITEMS = ["Dashboard", "AI Assistant", "Account Settings"];

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

function ChildPicker({ children, selectedId, setSelectedId }) {
  if (children.length <= 1) return null;
  return (
    <div className="flex gap-2 mb-4">
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

function ParentOverview({ children, selectedId, setSelectedId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    getChildAnalytics(selectedId)
      .then(setAnalytics)
      .catch((err) => setError(err.response?.data?.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [selectedId]);

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
    <div>
      <ChildPicker children={children} selectedId={selectedId} setSelectedId={setSelectedId} />
      {error && <p className="text-xs text-badge-red-text mb-3">{error}</p>}
      {loading || !analytics ? (
        <p className="text-sm text-gray-500">Loading {selectedChild?.name}'s progress…</p>
      ) : (
        <ChildAnalytics child={selectedChild} analytics={analytics} />
      )}
    </div>
  );
}

function ParentChat({ children, selectedId, setSelectedId }) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const selectedChild = children.find((c) => c._id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    setError("");
    setMessages([]);
    getMessages(selectedId)
      .then(setMessages)
      .catch((err) => setError(err.response?.data?.message || "Failed to load chat history"));
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !selectedId) return;
    const question = draft.trim();
    setDraft("");
    setSending(true);
    setError("");
    setMessages((prev) => [...prev, { _id: `pending-${Date.now()}`, role: "user", content: question }]);
    try {
      const { userMessage, assistantMessage } = await sendMessage(selectedId, question);
      setMessages((prev) => [...prev.filter((m) => !String(m._id).startsWith("pending-")), userMessage, assistantMessage]);
    } catch (err) {
      setError(err.response?.data?.message || "The chatbot failed to respond");
      setMessages((prev) => prev.filter((m) => !String(m._id).startsWith("pending-")));
      setDraft(question);
    } finally {
      setSending(false);
    }
  }

  if (children.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-card p-5 text-xs text-gray-500">
        No students are linked to your account yet. Contact your institution's admin to get
        linked to your child's account.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      <ChildPicker children={children} selectedId={selectedId} setSelectedId={setSelectedId} />
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 mb-3">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-4 mb-3">
        <p className="text-[10px] text-gray-400">
          Ask about {selectedChild?.name}'s quiz scores, weak topics, or overall progress. Answers
          are drawn only from {selectedChild?.name}'s recorded performance data.
        </p>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-card p-4 overflow-y-auto mb-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500">
            Ask a question, e.g. "Where is {selectedChild?.name} struggling?" or "How is the average score trending?"
          </p>
        )}
        {messages.map((m) => (
          <div key={m._id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-card px-3 py-2 text-xs ${
                m.role === "user" ? "bg-navy text-white" : "bg-badge-blue-bg text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-badge-blue-bg text-gray-500 rounded-card px-3 py-2 text-xs italic">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-xs"
          placeholder={`Ask about ${selectedChild?.name || "your child"}'s performance…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending || !selectedId}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim() || !selectedId}
          className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function ParentDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(true);

  useEffect(() => {
    getMyChildren()
      .then((list) => {
        setChildren(list);
        if (list.length > 0) setSelectedId(list[0]._id);
      })
      .finally(() => setLoadingChildren(false));
  }, []);

  return (
    <DashboardShell role="Parent" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {loadingChildren ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : activeNav === "Account Settings" ? (
        <AccountSettings />
      ) : activeNav === "AI Assistant" ? (
        <ParentChat children={children} selectedId={selectedId} setSelectedId={setSelectedId} />
      ) : (
        <ParentOverview children={children} selectedId={selectedId} setSelectedId={setSelectedId} />
      )}
    </DashboardShell>
  );
}
