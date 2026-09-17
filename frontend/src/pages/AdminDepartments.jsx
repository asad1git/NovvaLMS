import { useEffect, useState } from "react";
import { IconBuildingBank } from "@tabler/icons-react";
import { listDepartments, createDepartment } from "../api/departments";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });

  async function refresh() {
    setDepartments(await listDepartments());
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load departments");
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
      await createDepartment(form);
      setForm({ name: "", code: "" });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create department");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Loading departments…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-1">Create Department</h2>
        <p className="text-[11px] text-text-muted mb-3">
          Catalog courses can optionally be tagged to a department, and a Department Head account
          (created under Manage Users) can then view that department's report.
        </p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Department Name</label>
            <input
              className={inputClass}
              placeholder="e.g. Computer Science"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Code</label>
            <input
              className={inputClass}
              placeholder="e.g. CS"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={creating} className="sm:col-span-3 w-fit">
            {creating ? "Creating…" : "Create Department"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">All Departments ({departments.length})</h2>
        {departments.length === 0 && (
          <EmptyState icon={<IconBuildingBank size={32} className="text-text-muted" />} title="No departments yet." />
        )}
        <div className="flex flex-wrap gap-1.5">
          {departments.map((d) => (
            <Badge key={d._id} variant="gray">
              {d.code} — {d.name}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
