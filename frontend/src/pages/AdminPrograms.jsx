import { useEffect, useState } from "react";
import { IconSchool } from "@tabler/icons-react";
import { listPrograms, createProgram } from "../api/programs";
import { listCatalogCourses } from "../api/courses";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminPrograms() {
  const [programs, setPrograms] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    requiredCourses: [],
    totalCreditHoursRequired: 120,
    minGpaToGraduate: 2.0,
  });

  async function refresh() {
    const [p, c] = await Promise.all([listPrograms(), listCatalogCourses()]);
    setPrograms(p);
    setCatalog(c);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load programs");
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
      await createProgram(form);
      setForm({ name: "", code: "", requiredCourses: [], totalCreditHoursRequired: 120, minGpaToGraduate: 2.0 });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create program");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading programs…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-1">Create Degree Program</h2>
        <p className="text-[11px] text-text-muted mb-3">
          A fixed list of required courses a student must pass, plus the total credit hours and
          minimum GPA needed to graduate. Assign a student to a program under "Manage Users."
        </p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Program Name</label>
            <input
              className={inputClass}
              placeholder="e.g. BS Computer Science"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Code</label>
            <input
              className={inputClass}
              placeholder="e.g. BSCS"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Total Credit Hours Required</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={form.totalCreditHoursRequired}
              onChange={(e) => setForm({ ...form, totalCreditHoursRequired: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Minimum GPA to Graduate</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="4"
              className={inputClass}
              value={form.minGpaToGraduate}
              onChange={(e) => setForm({ ...form, minGpaToGraduate: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-text-muted mb-1">
              Required Courses (Ctrl/Cmd-click to select multiple)
            </label>
            <select
              multiple
              className={`w-full bg-white ${inputClass} h-[96px]`}
              value={form.requiredCourses}
              onChange={(e) =>
                setForm({ ...form, requiredCourses: Array.from(e.target.selectedOptions, (o) => o.value) })
              }
            >
              {catalog.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.title} ({c.creditHours} credit hours)
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={creating} className="sm:col-span-3 w-fit">
            {creating ? "Creating…" : "Create Program"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">All Programs ({programs.length})</h2>
        {programs.length === 0 && (
          <EmptyState icon={<IconSchool size={32} className="text-text-muted" />} title="No programs yet." />
        )}
        <div className="space-y-3">
          {programs.map((p) => (
            <div key={p._id} className="border-b border-line pb-3 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-main">{p.code} — {p.name}</span>
                <span className="text-[11px] text-text-muted">
                  {p.totalCreditHoursRequired} credit hours · min GPA {p.minGpaToGraduate}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {p.requiredCourses.length === 0 ? (
                  <span className="text-[11px] text-text-muted">No required courses configured.</span>
                ) : (
                  p.requiredCourses.map((c) => (
                    <Badge key={c._id} variant="gray">
                      {c.code}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
