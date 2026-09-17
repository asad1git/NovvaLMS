import { useEffect, useState } from "react";
import { IconUser } from "@tabler/icons-react";
import api from "../api/axios";
import { listUsers, createUser, updateUser } from "../api/users";
import { listDepartments } from "../api/departments";
import { listPrograms } from "../api/programs";
import { Card, Button, Badge, EmptyState, LoadingState, SearchInput } from "../components/ui";

const ROLE_BADGE_VARIANT = {
  admin: "gray",
  teacher: "blue",
  student: "amber",
  parent: "gray",
  registrar: "blue",
  hod: "gray",
  advisor: "amber",
};

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", role: "student", departmentId: "", programId: "" });
  const [creating, setCreating] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [assigningProgramId, setAssigningProgramId] = useState(null);

  async function refresh(role) {
    setLoading(true);
    try {
      setUsers(await listUsers(role));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/auth/me").then((r) => setCurrentUserId(r.data.data._id));
    listDepartments().then(setDepartments);
    listPrograms().then(setPrograms);
    refresh("");
  }, []);

  async function handleFilterChange(role) {
    setRoleFilter(role);
    setError("");
    await refresh(role);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const user = await createUser(form);
      setNotice(
        `${user.name} created. A temporary password was emailed to them (or logged to the server console if SMTP isn't configured yet).`
      );
      setForm({ name: "", email: "", role: "student", departmentId: "", programId: "" });
      await refresh(roleFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(user) {
    setError("");
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      await refresh(roleFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user");
    }
  }

  async function handleAssignProgram(user, programId) {
    setAssigningProgramId(user._id);
    setError("");
    try {
      await updateUser(user._id, { programId });
      await refresh(roleFilter);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign program");
    } finally {
      setAssigningProgramId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) return <LoadingState label="Loading users…" />;

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
        <h2 className="text-[13px] font-bold text-navy mb-3">Create User</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Full Name</label>
            <input
              className={inputClass}
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Role</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="advisor">Advisor</option>
              <option value="registrar">Registrar</option>
              <option value="hod">Department Head</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {form.role === "student" && (
            <div>
              <label className="block text-[11px] text-text-muted mb-1">Degree Program (optional)</label>
              <select
                className={`w-full bg-white ${inputClass}`}
                value={form.programId}
                onChange={(e) => setForm({ ...form, programId: e.target.value })}
              >
                <option value="">No program</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.role === "hod" && (
            <div>
              <label className="block text-[11px] text-text-muted mb-1">Heads Department</label>
              <select
                className={`w-full bg-white ${inputClass}`}
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                required
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit" disabled={creating} className="sm:col-span-3 w-fit">
            {creating ? "Creating…" : "Create User"}
          </Button>
        </form>
        <p className="text-[11px] text-text-muted mt-2">
          A temporary password is generated automatically and emailed to the user.
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="text-[13px] font-bold text-navy">All Users ({filteredUsers.length})</h2>
          <div className="flex items-center gap-2">
            <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search name or email…" className="w-52" />
            <select
              className={`bg-white ${inputClass} py-1`}
              value={roleFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="advisor">Advisor</option>
              <option value="registrar">Registrar</option>
              <option value="hod">Department Head</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          {filteredUsers.length === 0 && <EmptyState icon={<IconUser size={32} className="text-text-muted" />} title="No users found." />}
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div>
                <div className="text-text-main font-medium">{u.name}</div>
                <div className="text-[11px] text-text-muted">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {u.role === "student" && (
                  <select
                    className={`bg-white ${inputClass} py-1`}
                    value={u.program || ""}
                    disabled={assigningProgramId === u._id}
                    onChange={(e) => handleAssignProgram(u, e.target.value)}
                  >
                    <option value="">No program</option>
                    {programs.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.code}
                      </option>
                    ))}
                  </select>
                )}
                <Badge variant={ROLE_BADGE_VARIANT[u.role] || "gray"} className="capitalize">
                  {u.role}
                </Badge>
                {u._id === currentUserId ? (
                  <Badge variant="green" title="You can't deactivate your own account" className="opacity-60">
                    Active (you)
                  </Badge>
                ) : (
                  <button
                    onClick={() => handleToggleActive(u)}
                    className="cursor-pointer hover:opacity-80 transition-opacity duration-150"
                  >
                    <Badge variant={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
