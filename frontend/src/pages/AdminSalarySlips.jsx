import { useEffect, useState } from "react";
import { IconCash } from "@tabler/icons-react";
import { listTeachers } from "../api/courses";
import { listSalarySlips, createSalarySlip, downloadSalarySlipPdf } from "../api/finance";
import { Card, Button, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminSalarySlips() {
  const [employees, setEmployees] = useState([]);
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ employeeId: "", month: "", basicSalary: "", allowances: "", deductions: "" });

  async function refresh() {
    setSlips(await listSalarySlips());
  }

  useEffect(() => {
    (async () => {
      try {
        const [t] = await Promise.all([listTeachers(), refresh()]);
        setEmployees(t);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load salary slips");
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
      await createSalarySlip({
        ...form,
        basicSalary: Number(form.basicSalary),
        allowances: Number(form.allowances || 0),
        deductions: Number(form.deductions || 0),
      });
      setForm({ employeeId: "", month: "", basicSalary: "", allowances: "", deductions: "" });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create salary slip");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading salary slips…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Create Salary Slip</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Teacher</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
            >
              <option value="">Select teacher…</option>
              {employees.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Month</label>
            <input
              className={inputClass}
              placeholder="e.g. September 2026"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Basic Salary (Rs.)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="Basic salary"
              value={form.basicSalary}
              onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Allowances (optional)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="Allowances"
              value={form.allowances}
              onChange={(e) => setForm({ ...form, allowances: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Deductions (optional)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="Deductions"
              value={form.deductions}
              onChange={(e) => setForm({ ...form, deductions: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={creating} className="col-span-2 w-fit">
            {creating ? "Creating…" : "Create Slip"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">All Salary Slips ({slips.length})</h2>
        <div className="space-y-1">
          {slips.length === 0 && <EmptyState icon={<IconCash size={32} className="text-text-muted" />} title="No salary slips yet." />}
          {slips.map((s) => (
            <div
              key={s._id}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div>
                <div className="text-text-main font-medium">
                  {s.employee?.name} — {s.month}
                </div>
                <div className="text-[11px] text-text-muted">Net: Rs. {s.netSalary.toLocaleString()}</div>
              </div>
              <button
                onClick={() => downloadSalarySlipPdf(s._id, s.employee?.name, s.month)}
                className="text-navy-light hover:underline"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
