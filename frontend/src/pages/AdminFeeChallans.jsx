import { useEffect, useState } from "react";
import { IconReceipt2 } from "@tabler/icons-react";
import { listStudents, listFeeChallans, createFeeChallan, setFeeChallanStatus, downloadFeeChallanPdf } from "../api/finance";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

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

  if (loading) return <LoadingState label="Loading fee challans…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Create Fee Challan</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Amount (Rs.)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Due Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Description (optional)</label>
            <input
              className={inputClass}
              placeholder="e.g. Fall 2026 Semester Fee"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={creating} className="col-span-2 w-fit">
            {creating ? "Creating…" : "Create Challan"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">All Fee Challans ({challans.length})</h2>
        <div className="space-y-1">
          {challans.length === 0 && <EmptyState icon={<IconReceipt2 size={32} className="text-text-muted" />} title="No fee challans yet." />}
          {challans.map((c) => (
            <div
              key={c._id}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div>
                <div className="text-text-main font-medium">
                  {c.challanNumber} — {c.student?.name}
                </div>
                <div className="text-[11px] text-text-muted">
                  Rs. {c.amount.toLocaleString()} · due {new Date(c.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleToggleStatus(c)} className="hover:opacity-80 transition-opacity duration-150">
                  <Badge variant={c.status === "paid" ? "green" : "red"}>{c.status === "paid" ? "Paid" : "Unpaid"}</Badge>
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
      </Card>
    </div>
  );
}
