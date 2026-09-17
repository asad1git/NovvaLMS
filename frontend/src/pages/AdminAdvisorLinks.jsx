import { useEffect, useState } from "react";
import { IconUserCheck } from "@tabler/icons-react";
import { listUsers } from "../api/users";
import { listAdvisorLinks, linkAdvisor, unlinkAdvisor } from "../api/advisorLinks";
import { Card, Button, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminAdvisorLinks() {
  const [advisors, setAdvisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ advisorId: "", studentId: "" });

  async function refresh() {
    const [a, s, l] = await Promise.all([listUsers("advisor"), listUsers("student"), listAdvisorLinks()]);
    setAdvisors(a);
    setStudents(s);
    setLinks(l);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load advisor links");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLink(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      await linkAdvisor(form.advisorId, form.studentId);
      setNotice("Linked.");
      setForm({ advisorId: "", studentId: "" });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to link advisor to student");
    } finally {
      setCreating(false);
    }
  }

  async function handleUnlink(id) {
    setError("");
    try {
      await unlinkAdvisor(id);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unlink");
    }
  }

  if (loading) return <LoadingState label="Loading advisor links…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-badge-green-bg text-badge-green-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {notice}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Link an Advisor to a Student</h2>
        {advisors.length === 0 && (
          <p className="text-xs text-text-muted mb-3">
            No advisor accounts yet — create one under "Manage Users" (role: Advisor) first.
          </p>
        )}
        <form onSubmit={handleLink} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Advisor</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={form.advisorId}
              onChange={(e) => setForm({ ...form, advisorId: e.target.value })}
              required
            >
              <option value="">Select advisor…</option>
              {advisors.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Student</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required
            >
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={creating || advisors.length === 0 || students.length === 0}>
            {creating ? "Linking…" : "Link"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">All Links ({links.length})</h2>
        {links.length === 0 && <EmptyState icon={<IconUserCheck size={32} className="text-text-muted" />} title="No advisor-student links yet." />}
        <div className="space-y-1">
          {links.map((l) => (
            <div
              key={l._id}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div className="text-text-main">
                <span className="font-medium">{l.advisor?.name}</span>
                <span className="text-text-muted"> ({l.advisor?.email}) </span>
                <span className="text-text-muted">→ advises: </span>
                <span className="font-medium">{l.student?.name}</span>
                <span className="text-text-muted"> ({l.student?.email})</span>
              </div>
              <button onClick={() => handleUnlink(l._id)} className="text-badge-red-text hover:underline">
                Unlink
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
