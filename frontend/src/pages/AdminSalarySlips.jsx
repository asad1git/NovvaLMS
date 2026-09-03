import { useEffect, useState } from "react";
import { listTeachers } from "../api/courses";
import { listSalarySlips, createSalarySlip, downloadSalarySlipPdf } from "../api/finance";

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

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Create Salary Slip</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
          <select
            className="border border-gray-300 rounded px-3 py-2 text-xs bg-white"
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
          <input
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Month (e.g. September 2026)"
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
            required
          />
          <input
            type="number"
            min="0"
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Basic Salary (Rs.)"
            value={form.basicSalary}
            onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
            required
          />
          <input
            type="number"
            min="0"
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Allowances (optional)"
            value={form.allowances}
            onChange={(e) => setForm({ ...form, allowances: e.target.value })}
          />
          <input
            type="number"
            min="0"
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Deductions (optional)"
            value={form.deductions}
            onChange={(e) => setForm({ ...form, deductions: e.target.value })}
          />
          <button
            type="submit"
            disabled={creating}
            className="col-span-2 bg-navy text-white text-xs font-medium rounded px-4 py-2 w-fit disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Slip"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">All Salary Slips ({slips.length})</h2>
        <div className="space-y-1">
          {slips.length === 0 && <p className="text-xs text-gray-500">No salary slips yet.</p>}
          {slips.map((s) => (
            <div key={s._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
              <div>
                <div className="text-gray-900 font-medium">
                  {s.employee?.name} — {s.month}
                </div>
                <div className="text-[11px] text-gray-500">Net: Rs. {s.netSalary.toLocaleString()}</div>
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
      </div>
    </div>
  );
}
