import { useEffect, useState } from "react";
import { listCourses, getMaterials, uploadMaterial, replaceMaterial, deleteMaterial, downloadMaterial } from "../api/courses";
import {
  listQuizzesForCourse,
  createQuiz,
  generateQuizQuestions,
  setQuizPublished,
  getAttemptsForQuiz,
} from "../api/quizzes";
import {
  listSessions as listAttendanceSessions,
  createSession as createAttendanceSession,
  getSessionDetail,
  updateSessionRecords,
} from "../api/attendance";

const BLANK_QUESTION = () => ({
  type: "mcq",
  text: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  maxScore: 5,
  topic: "",
});

export default function TeacherCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadWarning, setUploadWarning] = useState("");
  const [replacingId, setReplacingId] = useState(null);

  const [quizzes, setQuizzes] = useState([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(30);
  const [questions, setQuestions] = useState([BLANK_QUESTION()]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [results, setResults] = useState([]);

  const [generateMaterialId, setGenerateMaterialId] = useState("");
  const [generateNumQuestions, setGenerateNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);

  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceOverall, setAttendanceOverall] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [markingSession, setMarkingSession] = useState(null);
  const [markingRecords, setMarkingRecords] = useState([]);
  const [savingMarks, setSavingMarks] = useState(false);

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
    setResultsQuiz(null);
    setMarkingSession(null);
    setMaterials([]); // clear immediately so a course switch never shows the previous course's list
    setQuizzes([]);
    setAttendanceSessions([]);
    setMaterials(await getMaterials(course._id));
    setQuizzes(await listQuizzesForCourse(course._id));
    const attendance = await listAttendanceSessions(course._id);
    setAttendanceSessions(attendance.sessions);
    setAttendanceOverall(attendance.overall);
  }

  async function refreshAttendance() {
    const attendance = await listAttendanceSessions(selectedCourse._id);
    setAttendanceSessions(attendance.sessions);
    setAttendanceOverall(attendance.overall);
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    if (!sessionDate || !selectedCourse) return;
    setCreatingSession(true);
    setError("");
    try {
      await createAttendanceSession(selectedCourse._id, sessionDate, sessionTopic);
      setSessionDate("");
      setSessionTopic("");
      setShowSessionForm(false);
      await refreshAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleOpenSession(sessionId) {
    setError("");
    try {
      const detail = await getSessionDetail(sessionId);
      setMarkingSession(detail.session);
      setMarkingRecords(detail.records);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load session");
    }
  }

  function updateRecordStatus(studentId, status) {
    setMarkingRecords((recs) => recs.map((r) => (r.student._id === studentId ? { ...r, status } : r)));
  }

  async function handleSaveMarks() {
    setSavingMarks(true);
    setError("");
    try {
      await updateSessionRecords(
        markingSession._id,
        markingRecords.map((r) => ({ studentId: r.student._id, status: r.status }))
      );
      setMarkingSession(null);
      await refreshAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setSavingMarks(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !selectedCourse) return;
    setUploading(true);
    setError("");
    setUploadWarning("");
    try {
      const uploaded = await uploadMaterial(selectedCourse._id, file, title);
      if (uploaded.textExtractionWarning) {
        setUploadWarning(`"${uploaded.title}": ${uploaded.textExtractionWarning}`);
      }
      setTitle("");
      setFile(null);
      e.target.reset();
      setMaterials(await getMaterials(selectedCourse._id));
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(materialId) {
    await deleteMaterial(materialId);
    setMaterials(await getMaterials(selectedCourse._id));
  }

  async function handleReplace(materialId, newFile) {
    if (!newFile) return;
    setReplacingId(materialId);
    setError("");
    setUploadWarning("");
    try {
      const updated = await replaceMaterial(materialId, newFile);
      if (updated.textExtractionWarning) {
        setUploadWarning(`"${updated.title}": ${updated.textExtractionWarning}`);
      }
      setMaterials(await getMaterials(selectedCourse._id));
    } catch (err) {
      setError(err.response?.data?.message || "Replace failed");
    } finally {
      setReplacingId(null);
    }
  }

  function updateQuestion(index, patch) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex, optIndex, value) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, oi) => (oi === optIndex ? value : o)) } : q
      )
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, BLANK_QUESTION()]);
  }

  function removeQuestion(index) {
    setQuestions((qs) => (qs.length > 1 ? qs.filter((_, i) => i !== index) : qs));
  }

  async function handleCreateQuiz(e) {
    e.preventDefault();
    setError("");
    setCreatingQuiz(true);
    try {
      await createQuiz(selectedCourse._id, {
        title: quizTitle,
        durationMinutes: Number(quizDuration),
        questions,
      });
      setQuizTitle("");
      setQuizDuration(30);
      setQuestions([BLANK_QUESTION()]);
      setShowQuizForm(false);
      setQuizzes(await listQuizzesForCourse(selectedCourse._id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create quiz");
    } finally {
      setCreatingQuiz(false);
    }
  }

  async function handleGenerate() {
    if (!generateMaterialId) return;
    setError("");
    setGenerating(true);
    try {
      const drafted = await generateQuizQuestions(selectedCourse._id, generateMaterialId, Number(generateNumQuestions));
      setQuestions(drafted.map((q) => ({ ...q, maxScore: q.maxScore || 1 })));
    } catch (err) {
      setError(err.response?.data?.message || "AI quiz generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleTogglePublish(quiz) {
    setError("");
    try {
      await setQuizPublished(quiz._id, !quiz.isPublished);
      setQuizzes(await listQuizzesForCourse(selectedCourse._id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update quiz");
    }
  }

  async function handleViewResults(quiz) {
    setResultsQuiz(quiz);
    setResults(await getAttemptsForQuiz(quiz._id));
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
          {courses.length === 0 && <p className="text-xs text-gray-500">No courses assigned yet.</p>}
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
              {c.description && <div className="text-[11px] text-gray-500">{c.description}</div>}
            </div>
          ))}
        </div>
      </div>

      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Materials — {selectedCourse.code}</h2>

          <form onSubmit={handleUpload} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-xs"
            />
            <input
              type="file"
              accept=".pdf,.pptx,.docx"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-xs"
            />
            <button
              type="submit"
              disabled={uploading || !file}
              className="bg-navy text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </form>
          <p className="text-[11px] text-gray-500 mb-3">PDF, PPTX, or DOCX — max 20MB.</p>
          {uploadWarning && (
            <div className="bg-badge-amber-bg text-badge-amber-text text-[11px] rounded px-3 py-2 mb-3">
              ⚠ {uploadWarning}
            </div>
          )}

          <div className="space-y-1">
            {materials.map((m) => (
              <div key={m._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <div>
                  <div className="text-gray-900 font-medium flex items-center gap-1.5">
                    {m.title}
                    {m.textExtractionWarning && (
                      <span
                        title={m.textExtractionWarning}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-badge-amber-bg text-badge-amber-text cursor-help"
                      >
                        ⚠ no readable text
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 uppercase">
                    {m.fileType} · {(m.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => downloadMaterial(m._id, m.fileName)} className="text-navy-light hover:underline">
                    Download
                  </button>
                  <label className="text-navy-light hover:underline cursor-pointer">
                    {replacingId === m._id ? "Replacing…" : "Replace"}
                    <input
                      type="file"
                      accept=".pdf,.pptx,.docx"
                      className="hidden"
                      disabled={replacingId === m._id}
                      onChange={(e) => {
                        const selected = e.target.files[0];
                        e.target.value = ""; // allow re-selecting the same filename later
                        handleReplace(m._id, selected);
                      }}
                    />
                  </label>
                  <button onClick={() => handleDelete(m._id)} className="text-badge-red-text hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {materials.length === 0 && <p className="text-xs text-gray-500">No materials uploaded yet.</p>}
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900">Quizzes — {selectedCourse.code}</h2>
            <button
              onClick={() => setShowQuizForm((v) => !v)}
              className="bg-navy text-white text-xs font-medium rounded px-3 py-1.5"
            >
              {showQuizForm ? "Cancel" : "New Quiz"}
            </button>
          </div>

          {showQuizForm && (
            <form onSubmit={handleCreateQuiz} className="border border-gray-200 rounded p-3 mb-4 space-y-3">
              <div className="bg-badge-blue-bg border border-navy-light/20 rounded p-3 flex items-center gap-2">
                <select
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
                  value={generateMaterialId}
                  onChange={(e) => setGenerateMaterialId(e.target.value)}
                >
                  <option value="">Generate from material…</option>
                  {materials.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-16 border border-gray-300 rounded px-2 py-1.5 text-xs"
                  value={generateNumQuestions}
                  onChange={(e) => setGenerateNumQuestions(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !generateMaterialId}
                  className="bg-navy-light text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Generate with AI"}
                </button>
              </div>
              {materials.length === 0 && (
                <p className="text-[10px] text-gray-400 -mt-2">
                  Upload a material above to enable AI generation.
                </p>
              )}

              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-xs"
                  placeholder="Quiz title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="1"
                  className="w-32 border border-gray-300 rounded px-3 py-2 text-xs"
                  placeholder="Minutes"
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(e.target.value)}
                  required
                />
              </div>

              {questions.map((q, qi) => (
                <div key={qi} className="border border-gray-100 rounded p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <select
                      className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
                      value={q.type}
                      onChange={(e) => updateQuestion(qi, { type: e.target.value })}
                    >
                      <option value="mcq">Multiple choice</option>
                      <option value="subjective">Subjective (manually graded)</option>
                    </select>
                    <input
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-xs"
                      placeholder={`Question ${qi + 1}`}
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                      required
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qi)}
                        className="text-[11px] text-badge-red-text hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    className="w-48 border border-gray-300 rounded px-2 py-1 text-[11px]"
                    placeholder="Topic (optional, e.g. Arrays)"
                    value={q.topic || ""}
                    onChange={(e) => updateQuestion(qi, { topic: e.target.value })}
                    maxLength={60}
                  />

                  {q.type === "subjective" ? (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Max score:</label>
                      <input
                        type="number"
                        min="1"
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                        value={q.maxScore}
                        onChange={(e) => updateQuestion(qi, { maxScore: Number(e.target.value) })}
                        required
                      />
                      <p className="text-[10px] text-gray-400">
                        The student types a free-text answer; you'll grade it under Grade Approvals.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className="flex items-center gap-2 text-xs">
                            <input
                              type="radio"
                              name={`correct-${qi}`}
                              checked={q.correctOptionIndex === oi}
                              onChange={() => updateQuestion(qi, { correctOptionIndex: oi })}
                            />
                            <input
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                              placeholder={`Option ${oi + 1}`}
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              required
                            />
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400">Select the radio button next to the correct option.</p>
                    </>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <button type="button" onClick={addQuestion} className="text-xs text-navy-light hover:underline">
                  + Add another question
                </button>
                <button
                  type="submit"
                  disabled={creatingQuiz}
                  className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
                >
                  {creatingQuiz ? "Creating…" : "Create Quiz"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1">
            {quizzes.length === 0 && <p className="text-xs text-gray-500">No quizzes yet.</p>}
            {quizzes.map((q) => (
              <div key={q._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <div>
                  <div className="text-gray-900 font-medium">{q.title}</div>
                  <div className="text-[11px] text-gray-400">{q.durationMinutes} min</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      q.isPublished ? "bg-badge-green-bg text-badge-green-text" : "bg-badge-amber-bg text-badge-amber-text"
                    }`}
                  >
                    {q.isPublished ? "Published" : "Draft"}
                  </span>
                  <button onClick={() => handleTogglePublish(q)} className="text-navy-light hover:underline">
                    {q.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => handleViewResults(q)} className="text-navy-light hover:underline">
                    Results
                  </button>
                </div>
              </div>
            ))}
          </div>

          {resultsQuiz && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <h3 className="text-xs font-medium text-gray-900 mb-2">Results — {resultsQuiz.title}</h3>
              <div className="space-y-1">
                {results.length === 0 && <p className="text-xs text-gray-500">No attempts yet.</p>}
                {results.map((r) => (
                  <div key={r._id} className="flex justify-between text-xs border-b border-gray-100 py-1">
                    <span>{r.student?.name}</span>
                    <span className="text-gray-500">
                      {!r.submittedAt
                        ? "In progress"
                        : r.gradingComplete
                        ? `${r.score}/${r.maxScore}`
                        : `${r.score}/${r.maxScore} (pending review)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCourse && (
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900">
              Attendance — {selectedCourse.code}
              {attendanceOverall?.averageAttendanceRate != null && (
                <span className="text-[11px] text-gray-500 font-normal ml-2">
                  ({attendanceOverall.averageAttendanceRate}% average)
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowSessionForm((s) => !s)}
              className="bg-navy text-white text-xs font-medium rounded px-3 py-1.5"
            >
              {showSessionForm ? "Cancel" : "New Session"}
            </button>
          </div>

          {showSessionForm && (
            <form onSubmit={handleCreateSession} className="flex items-center gap-2 mb-4 border border-gray-200 rounded p-3">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-xs"
                required
              />
              <input
                type="text"
                placeholder="Topic (optional)"
                value={sessionTopic}
                onChange={(e) => setSessionTopic(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={creatingSession}
                className="bg-navy-light text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-50"
              >
                {creatingSession ? "Creating…" : "Create"}
              </button>
            </form>
          )}

          {markingSession ? (
            <div className="border border-gray-200 rounded p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-900">
                  Mark attendance — {new Date(markingSession.date).toLocaleDateString()}
                  {markingSession.topic && ` (${markingSession.topic})`}
                </h3>
                <button onClick={() => setMarkingSession(null)} className="text-[11px] text-gray-500 hover:underline">
                  Close
                </button>
              </div>
              <div className="space-y-1 mb-3">
                {markingRecords.map((r) => (
                  <div key={r._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-1.5">
                    <span className="text-gray-900">{r.student.name}</span>
                    <select
                      value={r.status}
                      onChange={(e) => updateRecordStatus(r.student._id, e.target.value)}
                      className={`text-[11px] border rounded px-2 py-1 ${
                        r.status === "present"
                          ? "bg-badge-green-bg text-badge-green-text border-transparent"
                          : r.status === "absent"
                          ? "bg-badge-red-bg text-badge-red-text border-transparent"
                          : "bg-badge-amber-bg text-badge-amber-text border-transparent"
                      }`}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveMarks}
                disabled={savingMarks}
                className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
              >
                {savingMarks ? "Saving…" : "Save Attendance"}
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {attendanceSessions.length === 0 && <p className="text-xs text-gray-500">No sessions recorded yet.</p>}
              {attendanceSessions.map((s) => (
                <div
                  key={s._id}
                  onClick={() => handleOpenSession(s._id)}
                  className="flex items-center justify-between text-xs border-b border-gray-100 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <div className="text-gray-900 font-medium">{new Date(s.date).toLocaleDateString()}</div>
                    {s.topic && <div className="text-[11px] text-gray-400">{s.topic}</div>}
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {s.presentCount}/{s.totalStudents} present
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
