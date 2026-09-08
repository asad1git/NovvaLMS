import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconBooks, IconFileText, IconNotes, IconClipboardList } from "@tabler/icons-react";
import { listCourses, getMaterials, downloadMaterial } from "../api/courses";
import { listQuizzesForCourse } from "../api/quizzes";
import {
  listAssignments,
  downloadAssignmentFile,
  submitAssignment as apiSubmitAssignment,
} from "../api/assignments";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

export default function StudentCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submitFile, setSubmitFile] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

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
    setAssignments([]);
    setMaterials(await getMaterials(course._id));
    setQuizzes(await listQuizzesForCourse(course._id));
    setAssignments(await listAssignments(course._id));
  }

  async function handleSubmitAssignment(assignmentId) {
    const file = submitFile[assignmentId];
    if (!file) return;
    setSubmittingId(assignmentId);
    setError("");
    try {
      await apiSubmitAssignment(assignmentId, file);
      setSubmitFile((prev) => ({ ...prev, [assignmentId]: null }));
      setAssignments(await listAssignments(selectedCourse._id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit assignment");
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) return <LoadingState label="Loading courses…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">My Courses</h2>
        <div className="space-y-2">
          {courses.length === 0 && (
            <EmptyState icon={<IconBooks size={32} className="text-text-muted" />} title="You are not enrolled in any courses yet." />
          )}
          {courses.map((c) => (
            <div
              key={c._id}
              onClick={() => openCourse(c)}
              className={`px-3 py-2 rounded cursor-pointer border transition-colors duration-150 ${
                selectedCourse?._id === c._id
                  ? "border-navy-light bg-badge-blue-bg"
                  : "border-line hover:bg-bg-page"
              }`}
            >
              <div className="text-xs font-medium text-text-main">
                {c.code} — {c.title}
              </div>
              <div className="text-[11px] text-text-muted">Teacher: {c.teacher?.name || "—"}</div>
            </div>
          ))}
        </div>
      </Card>

      {selectedCourse && (
        <Card>
          <h2 className="text-[13px] font-bold text-navy mb-3">Materials — {selectedCourse.code}</h2>
          <div className="space-y-1">
            {materials.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
              >
                <div>
                  <div className="text-text-main font-medium">{m.title}</div>
                  <div className="text-[11px] text-text-muted uppercase">
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
            {materials.length === 0 && <EmptyState icon={<IconFileText size={32} className="text-text-muted" />} title="No materials uploaded yet." />}
          </div>
        </Card>
      )}

      {selectedCourse && (
        <Card>
          <h2 className="text-[13px] font-bold text-navy mb-3">Quizzes — {selectedCourse.code}</h2>
          <div className="space-y-1">
            {quizzes.map((q) => (
              <div
                key={q._id}
                className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
              >
                <div>
                  <div className="text-text-main font-medium">{q.title}</div>
                  <div className="text-[11px] text-text-muted">{q.durationMinutes} min</div>
                </div>
                <Button onClick={() => navigate(`/quiz/${q._id}`)} size="sm">
                  Open
                </Button>
              </div>
            ))}
            {quizzes.length === 0 && <EmptyState icon={<IconNotes size={32} className="text-text-muted" />} title="No quizzes available yet." />}
          </div>
        </Card>
      )}

      {selectedCourse && (
        <Card>
          <h2 className="text-[13px] font-bold text-navy mb-3">Assignments — {selectedCourse.code}</h2>
          <div className="space-y-3">
            {assignments.map((a) => {
              const sub = a.mySubmission;
              const locked = sub && sub.gradeStatus === "graded";
              return (
                <div key={a._id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-text-main font-medium text-xs">{a.title}</div>
                      <div className="text-[11px] text-text-muted">
                        Due {new Date(a.dueDate).toLocaleString()} · Max {a.maxScore}
                        {a.isPastDue && !sub && <span className="text-badge-red-text"> · Past due</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadAssignmentFile(a._id, a.fileName)}
                      className="text-navy-light hover:underline text-xs whitespace-nowrap"
                    >
                      Download
                    </button>
                  </div>

                  {a.description && <p className="text-[11px] text-text-muted mt-1">{a.description}</p>}

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {sub ? (
                      <>
                        <Badge variant={sub.isLate ? "red" : "green"}>{sub.isLate ? "Submitted late" : "Submitted on time"}</Badge>
                        {sub.gradeStatus === "graded" ? (
                          <Badge variant="green">
                            {sub.score}/{a.maxScore}
                          </Badge>
                        ) : (
                          <Badge variant="amber">Pending review</Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="gray">Not submitted</Badge>
                    )}
                  </div>

                  {!locked && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        accept=".pdf,.pptx,.docx"
                        onChange={(e) => setSubmitFile((prev) => ({ ...prev, [a._id]: e.target.files[0] }))}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSubmitAssignment(a._id)}
                        disabled={submittingId === a._id || !submitFile[a._id]}
                      >
                        {submittingId === a._id ? "Submitting…" : sub ? "Resubmit" : a.isPastDue ? "Submit Late" : "Submit"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {assignments.length === 0 && (
              <EmptyState icon={<IconClipboardList size={32} className="text-text-muted" />} title="No assignments posted yet." />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
