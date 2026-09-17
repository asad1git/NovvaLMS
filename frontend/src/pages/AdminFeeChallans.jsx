import { useEffect, useState } from "react";
import { IconReceipt2 } from "@tabler/icons-react";
import {
  listStudents,
  listFeeChallans,
  createFeeChallan,
  setFeeChallanStatus,
  downloadFeeChallanPdf,
  listFeeStructures,
  setFeeStructure,
  generateChallans,
} from "../api/finance";
import { listTerms } from "../api/courses";
import { Card, Button, Badge, EmptyState, LoadingState, SearchInput } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminFeeChallans() {
  const [students, setStudents] = useState([]);
  const [challans, setChallans] = useState([]);
  const [terms, setTerms] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ studentId: "", amount: "", dueDate: "", description: "" });
  const [challanSearch, setChallanSearch] = useState("");

  const [structureForm, setStructureForm] = useState({ termId: "", perCreditHourRate: "", fixedFees: "" });
  const [savingStructure, setSavingStructure] = useState(false);
  const [generateForm, setGenerateForm] = useState({ termId: "", dueDate: "", description: "" });
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);

  async function refresh() {
    setChallans(await listFeeChallans());
  }

  async function refreshStructures() {
    setStructures(await listFeeStructures());
  }

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([listStudents(), listTerms(), refresh(), refreshStructures()]);
        setStudents(s);
        setTerms(t);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load fee challans");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSetStructure(e) {
    e.preventDefault();
    setSavingStructure(true);
    setError("");
    try {
      await setFeeStructure({
        termId: structureForm.termId,
        perCreditHourRate: Number(structureForm.perCreditHourRate),
        fixedFees: structureForm.fixedFees ? Number(structureForm.fixedFees) : 0,
      });
      setStructureForm({ termId: "", perCreditHourRate: "", fixedFees: "" });
      await refreshStructures();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save fee structure");
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setGenerateResult(null);
    try {
      const result = await generateChallans(generateForm);
      setGenerateResult(result);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate fee challans");
    } finally {
      setGenerating(false);
    }
  }

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

  const filteredChallans = challans.filter((c) => {
    const q = challanSearch.trim().toLowerCase();
    if (!q) return true;
    return c.challanNumber.toLowerCase().includes(q) || c.student?.name?.toLowerCase().includes(q);
  });

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
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <Button type="submit" disabled={creating} className="sm:col-span-2 w-fit">
            {creating ? "Creating…" : "Create Challan"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Fee Structure (per Term)</h2>
        <form onSubmit={handleSetStructure} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Term</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={structureForm.termId}
              onChange={(e) => setStructureForm({ ...structureForm, termId: e.target.value })}
              required
            >
              <option value="">Select term…</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Rate per Credit Hour (Rs.)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="e.g. 8000"
              value={structureForm.perCreditHourRate}
              onChange={(e) => setStructureForm({ ...structureForm, perCreditHourRate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Fixed Fees (Rs., optional)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="e.g. 5000"
              value={structureForm.fixedFees}
              onChange={(e) => setStructureForm({ ...structureForm, fixedFees: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={savingStructure} className="sm:col-span-3 w-fit">
            {savingStructure ? "Saving…" : "Save Fee Structure"}
          </Button>
        </form>
        {structures.length > 0 && (
          <div className="space-y-1 border-t border-line pt-3">
            {structures.map((s) => (
              <div key={s._id} className="flex items-center justify-between text-xs py-1">
                <span className="text-text-main">{s.term?.name}</span>
                <span className="text-text-muted">
                  Rs. {s.perCreditHourRate.toLocaleString()}/credit hour
                  {s.fixedFees > 0 && ` + Rs. ${s.fixedFees.toLocaleString()} fixed`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Auto-Generate Challans from Registration</h2>
        <p className="text-[11px] text-text-muted mb-3">
          Bills every student enrolled in that term based on their total registered credit hours ×
          the term's rate above. Students already billed for the term are skipped, so this is safe
          to re-run after new registrations.
        </p>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Term</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={generateForm.termId}
              onChange={(e) => setGenerateForm({ ...generateForm, termId: e.target.value })}
              required
            >
              <option value="">Select term…</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Due Date</label>
            <input
              type="date"
              className={inputClass}
              value={generateForm.dueDate}
              onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Description (optional)</label>
            <input
              className={inputClass}
              placeholder="e.g. Fall 2026 Tuition"
              value={generateForm.description}
              onChange={(e) => setGenerateForm({ ...generateForm, description: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={generating} className="sm:col-span-3 w-fit">
            {generating ? "Generating…" : "Generate Challans"}
          </Button>
        </form>
        {generateResult && (
          <div className="mt-3 border-t border-line pt-3 text-xs space-y-1">
            <div className="text-badge-green-text font-medium">
              Generated {generateResult.generated.length} challan(s)
            </div>
            {generateResult.generated.map((g) => (
              <div key={g.challanNumber} className="text-text-muted">
                {g.challanNumber} — {g.name}: Rs. {g.amount.toLocaleString()}
              </div>
            ))}
            {generateResult.skipped.length > 0 && (
              <div className="text-text-muted mt-2">
                Skipped {generateResult.skipped.length}: {generateResult.skipped.map((s) => s.name).join(", ")}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="text-[13px] font-bold text-navy">All Fee Challans ({filteredChallans.length})</h2>
          <SearchInput value={challanSearch} onChange={setChallanSearch} placeholder="Search student or challan #…" className="w-64" />
        </div>
        <div className="space-y-1">
          {filteredChallans.length === 0 && (
            <EmptyState
              icon={<IconReceipt2 size={32} className="text-text-muted" />}
              title={challans.length === 0 ? "No fee challans yet." : "No matches."}
            />
          )}
          {filteredChallans.map((c) => (
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
