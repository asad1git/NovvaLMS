import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCourses, getMaterials, downloadMaterial } from "../api/courses";
import { listQuizzesForCourse } from "../api/quizzes";

export default function StudentCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setCourses(await listCourses());
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openCourse(course) {
    setSelectedCourse(course);
    setError("");
    setMaterials([]); // clear immediately so a course switch never shows the previous course's list
    setQuizzes([]);
    setMaterials(await getMaterials(course._id));
    setQuizzes(await listQuizzesForCourse(course._id));
  }

  if (loading) return <div className="text-sm text-gray-500">Loading courses…</div>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">My Courses</h2>
        <div className="space-y-2">
          {courses.length === 0 && (
            <p className="text-xs text-gray-500">You are not enrolled in any courses yet.</p>
          )}
          {courses.map((c) => (
            <div
              key={c._id}
              onClick={() => openCourse(c)}
              className={`px-3 py-2 rounded cursor-pointer border ${
                selectedCourse?._id === c._id
                  ? "border-navy-light bg-badge-blue-bg"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="text-xs font-medium text-gray-900">
                {c.code} — {c.title}
              </div>
              <div className="text-[11px] text-gray-500">Teacher: {c.teacher?.name || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Materials — {selectedCourse.code}</h2>
          <div className="space-y-1">
            {materials.map((m) => (
              <div key={m._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <div>
                  <div className="text-gray-900 font-medium">{m.title}</div>
                  <div className="text-[11px] text-gray-400 uppercase">
                    {m.fileType} · {(m.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  onClick={() => downloadMaterial(m._id, m.fileName)}
                  className="text-navy-light hover:underline text-xs"
                >
                  Download
                </button>
              </div>
            ))}
            {materials.length === 0 && <p className="text-xs text-gray-500">No materials uploaded yet.</p>}
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Quizzes — {selectedCourse.code}</h2>
          <div className="space-y-1">
            {quizzes.map((q) => (
              <div key={q._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <div>
                  <div className="text-gray-900 font-medium">{q.title}</div>
                  <div className="text-[11px] text-gray-400">{q.durationMinutes} min</div>
                </div>
                <button
                  onClick={() => navigate(`/quiz/${q._id}`)}
                  className="bg-navy text-white text-xs font-medium rounded px-3 py-1.5"
                >
                  Open
                </button>
              </div>
            ))}
            {quizzes.length === 0 && <p className="text-xs text-gray-500">No quizzes available yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
