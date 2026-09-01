import { useEffect, useState } from "react";
import { listCourses, createCourse, listTeachers, bulkEnrollCSV, getEnrollments } from "../api/courses";

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ title: "", code: "", description: "", teacherId: "" });
  const [creating, setCreating] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([listCourses(), listTeachers()]);
        setCourses(c);
        setTeachers(t);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load courses");
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
      await createCourse(form);
      setForm({ title: "", code: "", description: "", teacherId: "" });
      setCourses(await listCourses());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create course");
    } finally {
      setCreating(false);
    }
  }

  async function openCourse(course) {
    setSelectedCourse(course);
    setEnrollResult(null);
    setError("");
    setRoster([]); // clear immediately so a course switch never shows the previous course's roster
    setRoster(await getEnrollments(course._id));
  }

  async function handleEnroll(e) {
    e.preventDefault();
    if (!csvFile || !selectedCourse) return;
    setEnrolling(true);
    setError("");
    try {
      const result = await bulkEnrollCSV(selectedCourse._id, csvFile);
      setEnrollResult(result);
      setRoster(await getEnrollments(selectedCourse._id));
      setCsvFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading courses…</div>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Create Course</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
          <input
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Course title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Course code (e.g. CS201)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <select
            className="border border-gray-300 rounded px-3 py-2 text-xs bg-white"
            value={form.teacherId}
            onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            required
          >
            <option value="">Assign teacher…</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            className="border border-gray-300 rounded px-3 py-2 text-xs"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button
            type="submit"
            disabled={creating}
            className="col-span-2 bg-navy text-white text-xs font-medium rounded px-4 py-2 w-fit disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Course"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">All Courses</h2>
        <div className="space-y-2">
          {courses.length === 0 && <p className="text-xs text-gray-500">No courses yet.</p>}
          {courses.map((c) => (
            <div
              key={c._id}
              onClick={() => openCourse(c)}
              className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer border ${
                selectedCourse?._id === c._id
                  ? "border-navy-light bg-badge-blue-bg"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div>
                <div className="text-xs font-medium text-gray-900">
                  {c.code} — {c.title}
                </div>
                <div className="text-[11px] text-gray-500">Teacher: {c.teacher?.name || "—"}</div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded ${
                  c.isActive ? "bg-badge-green-bg text-badge-green-text" : "bg-badge-red-bg text-badge-red-text"
                }`}
              >
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Bulk Enroll — {selectedCourse.code}</h2>
          <form onSubmit={handleEnroll} className="flex items-center gap-2 mb-2">
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="text-xs" />
            <button
              type="submit"
              disabled={enrolling || !csvFile}
              className="bg-navy-light text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-50"
            >
              {enrolling ? "Uploading…" : "Upload CSV"}
            </button>
          </form>
          <p className="text-[11px] text-gray-500 mb-3">
            CSV must have an "email" column of existing student accounts.
          </p>

          {enrollResult && (
            <div className="grid grid-cols-3 gap-2 mb-4 text-[11px]">
              <div className="bg-badge-green-bg text-badge-green-text rounded px-2 py-1">
                Enrolled: {enrollResult.enrolled.length}
              </div>
              <div className="bg-badge-amber-bg text-badge-amber-text rounded px-2 py-1">
                Already enrolled: {enrollResult.skipped.length}
              </div>
              <div className="bg-badge-red-bg text-badge-red-text rounded px-2 py-1">
                Not found: {enrollResult.notFound.length}
              </div>
            </div>
          )}

          <h3 className="text-xs font-medium text-gray-900 mb-2">Roster ({roster.length})</h3>
          <div className="space-y-1">
            {roster.map((e) => (
              <div key={e._id} className="text-xs text-gray-600 flex justify-between border-b border-gray-100 py-1">
                <span>{e.student?.name}</span>
                <span className="text-gray-400">{e.student?.email}</span>
              </div>
            ))}
            {roster.length === 0 && <p className="text-xs text-gray-500">No students enrolled yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
