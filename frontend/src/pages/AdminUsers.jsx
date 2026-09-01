import { useEffect, useState } from "react";
import api from "../api/axios";
import { listUsers, createUser, updateUser } from "../api/users";

const ROLE_BADGE = {
  admin: "bg-gray-100 text-gray-700",
  teacher: "bg-badge-blue-bg text-badge-blue-text",
  student: "bg-badge-amber-bg text-badge-amber-text",
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", role: "student" });
  const [creating, setCreating] = useState(false);

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
      setForm({ name: "", email: "", role: "student" });
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

  if (loading) return <div className="text-sm text-gray-500">Loading users…</div>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>
      )}
      {notice && (
        <div className="bg-badge-green-bg text-badge-green-text text-xs rounded-card px-4 py-2">{notice}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Create User</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3">
          <input
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <select
            className="border border-gray-300 rounded px-3 py-2 text-xs bg-white"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="col-span-3 bg-navy text-white text-xs font-medium rounded px-4 py-2 w-fit disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create User"}
          </button>
        </form>
        <p className="text-[11px] text-gray-500 mt-2">
          A temporary password is generated automatically and emailed to the user.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">All Users ({users.length})</h2>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
            value={roleFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div className="space-y-1">
          {users.length === 0 && <p className="text-xs text-gray-500">No users found.</p>}
          {users.map((u) => (
            <div key={u._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
              <div>
                <div className="text-gray-900 font-medium">{u.name}</div>
                <div className="text-[11px] text-gray-400">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${ROLE_BADGE[u.role] || "bg-gray-100 text-gray-700"}`}>
                  {u.role}
                </span>
                {u._id === currentUserId ? (
                  <span
                    title="You can't deactivate your own account"
                    className="text-[10px] px-2 py-0.5 rounded bg-badge-green-bg text-badge-green-text opacity-60"
                  >
                    Active (you)
                  </span>
                ) : (
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`text-[10px] px-2 py-0.5 rounded cursor-pointer hover:opacity-80 ${
                      u.isActive ? "bg-badge-green-bg text-badge-green-text" : "bg-badge-red-bg text-badge-red-text"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
