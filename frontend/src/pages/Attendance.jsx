import { useEffect, useState } from "react";
import { listCourses } from "../api/courses";
import { listSessions } from "../api/attendance";

const LOW_ATTENDANCE_THRESHOLD = 75; // a common university attendance policy cutoff

function statusBadgeClass(status) {
  if (status === "present") return "bg-badge-green-bg text-badge-green-text";
  if (status === "absent") return "bg-badge-red-bg text-badge-red-text";
  if (status === "late") return "bg-badge-amber-bg text-badge-amber-text";
  if (status === "excused") return "bg-badge-blue-bg text-badge-blue-text";
  return "bg-gray-100 text-gray-500";
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-5">
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-badge-red-text" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

export default function Attendance() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await listCourses();
        setCourses(list);
        if (list.length > 0) setCourseId(list[0]._id);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setError("");
    setData(null);
    listSessions(courseId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || "Failed to load attendance"));
  }, [courseId]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-card p-4">
        <label className="text-xs text-gray-600 mr-2">Course:</label>
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {courses.length === 0 && <option value="">No enrolled courses</option>}
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.code} — {c.title}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-badge-red-text">{error}</p>}

      {!data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Sessions Recorded" value={data.overall.totalSessions} />
            <StatCard label="Sessions Attended" value={data.overall.presentCount} />
            <StatCard
              label="Attendance Rate"
              value={data.overall.percentage !== null ? `${data.overall.percentage}%` : "—"}
              accent={data.overall.percentage !== null && data.overall.percentage < LOW_ATTENDANCE_THRESHOLD}
            />
          </div>

          {data.overall.percentage !== null && data.overall.percentage < LOW_ATTENDANCE_THRESHOLD && (
            <div className="bg-badge-red-bg border border-badge-red-text/20 rounded-card p-4 text-xs text-badge-red-text">
              Your attendance in this course is below {LOW_ATTENDANCE_THRESHOLD}% — check your institution's
              attendance policy, this can affect eligibility for exams.
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Session History</h2>
            {data.sessions.length === 0 && <p className="text-xs text-gray-500">No sessions recorded yet.</p>}
            <div className="space-y-1">
              {data.sessions.map((s) => (
                <div key={s._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                  <div>
                    <div className="text-gray-900 font-medium">{new Date(s.date).toLocaleDateString()}</div>
                    {s.topic && <div className="text-[11px] text-gray-400">{s.topic}</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${statusBadgeClass(s.status)}`}>
                    {s.status || "not marked"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
