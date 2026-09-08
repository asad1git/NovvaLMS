import { useEffect, useState } from "react";
import { IconLink } from "@tabler/icons-react";
import { listUsers } from "../api/users";
import { listParentLinks, linkParent, unlinkParent } from "../api/parentLinks";
import { Card, Button, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminParentLinks() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ parentId: "", studentId: "" });

  async function refresh() {
    const [p, s, l] = await Promise.all([listUsers("parent"), listUsers("student"), listParentLinks()]);
    setParents(p);
    setStudents(s);
    setLinks(l);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load parent links");
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
      await linkParent(form.parentId, form.studentId);
      setNotice("Linked.");
      setForm({ parentId: "", studentId: "" });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to link parent to student");
    } finally {
      setCreating(false);
    }
  }

  async function handleUnlink(id) {
    setError("");
    try {
      await unlinkParent(id);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unlink");
    }
  }

  if (loading) return <LoadingState label="Loading parent links…" />;

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
        <h2 className="text-sm font-medium text-text-main mb-3">Link a Parent to a Student</h2>
        {parents.length === 0 && (
          <p className="text-xs text-text-muted mb-3">
            No parent accounts yet — create one under "Manage Users" (role: Parent) first.
          </p>
        )}
        <form onSubmit={handleLink} className="grid grid-cols-3 gap-3">
          <select
            className={`bg-white ${inputClass}`}
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            required
          >
            <option value="">Select parent…</option>
            {parents.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.email})
              </option>
            ))}
          </select>
          <select
            className={`bg-white ${inputClass}`}
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
          <Button type="submit" disabled={creating || parents.length === 0 || students.length === 0}>
            {creating ? "Linking…" : "Link"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-text-main mb-3">All Links ({links.length})</h2>
        {links.length === 0 && <EmptyState icon={<IconLink size={32} className="text-text-muted" />} title="No parent-student links yet." />}
        <div className="space-y-1">
          {links.map((l) => (
            <div
              key={l._id}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div className="text-text-main">
                <span className="font-medium">{l.parent?.name}</span>
                <span className="text-text-muted"> ({l.parent?.email}) </span>
                <span className="text-text-muted">→ child: </span>
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
