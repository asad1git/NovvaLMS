import { useEffect, useState } from "react";
import { listUsers } from "../api/users";
import { listParentLinks, linkParent, unlinkParent } from "../api/parentLinks";

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

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="space-y-5">
      {error && <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>}
      {notice && <div className="bg-badge-green-bg text-badge-green-text text-xs rounded-card px-4 py-2">{notice}</div>}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Link a Parent to a Student</h2>
        {parents.length === 0 && (
          <p className="text-xs text-gray-500 mb-3">
            No parent accounts yet — create one under "Manage Users" (role: Parent) first.
          </p>
        )}
        <form onSubmit={handleLink} className="grid grid-cols-3 gap-3">
          <select
            className="border border-gray-300 rounded px-3 py-2 text-xs bg-white"
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
            className="border border-gray-300 rounded px-3 py-2 text-xs bg-white"
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
          <button
            type="submit"
            disabled={creating || parents.length === 0 || students.length === 0}
            className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {creating ? "Linking…" : "Link"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">All Links ({links.length})</h2>
        {links.length === 0 && <p className="text-xs text-gray-500">No parent-student links yet.</p>}
        <div className="space-y-1">
          {links.map((l) => (
            <div key={l._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
              <div className="text-gray-900">
                <span className="font-medium">{l.parent?.name}</span>
                <span className="text-gray-400"> ({l.parent?.email}) </span>
                <span className="text-gray-500">→ child: </span>
                <span className="font-medium">{l.student?.name}</span>
                <span className="text-gray-400"> ({l.student?.email})</span>
              </div>
              <button onClick={() => handleUnlink(l._id)} className="text-badge-red-text hover:underline">
                Unlink
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
