import { useEffect, useState } from "react";
import { listStudents, listFeeChallans, createFeeChallan, setFeeChallanStatus, downloadFeeChallanPdf } from "../api/finance";

export default function AdminFeeChallans() {
  const [students, setStudents] = useState([]);
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ studentId: "", amount: "", dueDate: "", description: "" });

  async function refresh() {
    setChallans(await listFeeChallans());
  }

  useEffect(() => {
    (async () => {
      try {
        const [s] = await Promise.all([listStudents(), refresh()]);
        setStudents(s);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load fee challans");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await createFeeChallan({ ...form, amount: Number(form.amount) });
      setForm({ studentId: "", amount: "", dueDate: "", description: "" });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create fee challan");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(challan) {
    setError("");
    try {
      await setFeeChallanStatus(challan._id, challan.status === "paid" ? "unpaid" : "paid");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Create Fee Challan</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
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
          <input
            type="number"
            min="0"
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Amount (Rs.)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <input
            type="date"
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            required
          />
          <input
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Description (e.g. Fall 2026 Semester Fee)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button
            type="submit"
            disabled={creating}
            className="col-span-2 bg-navy text-white text-xs font-medium rounded px-4 py-2 w-fit disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Challan"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">All Fee Challans ({challans.length})</h2>
        <div className="space-y-1">
          {challans.length === 0 && <p className="text-xs text-gray-500">No fee challans yet.</p>}
          {challans.map((c) => (
            <div key={c._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
              <div>
                <div className="text-gray-900 font-medium">
                  {c.challanNumber} — {c.student?.name}
                </div>
                <div className="text-[11px] text-gray-500">
                  Rs. {c.amount.toLocaleString()} · due {new Date(c.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleStatus(c)}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    c.status === "paid" ? "bg-badge-green-bg text-badge-green-text" : "bg-badge-red-bg text-badge-red-text"
                  }`}
                >
                  {c.status === "paid" ? "Paid" : "Unpaid"}
                </button>
                <button
                  onClick={() => downloadFeeChallanPdf(c._id, c.challanNumber)}
                  className="text-navy-light hover:underline"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
