import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconFolderOpen,
  IconCloudUpload,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconFileTypePpt,
  IconTrash,
  IconDownload,
  IconRefresh,
  IconSparkles,
  IconEyeOff,
  IconSend,
  IconPlus,
  IconCalendarPlus,
} from "@tabler/icons-react";
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
import { Card, Button, IconButton, Badge, EmptyState, LoadingState, CourseCard, Tabs } from "../components/ui";

const inputClass =
  "border-[1.5px] border-line rounded-input px-3 py-2 text-[13px] transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light";

const TABS = ["Materials", "Quizzes", "Attendance", "Results"];

const BLANK_QUESTION = () => ({
  type: "mcq",
  text: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  maxScore: 5,
  topic: "",
});

const FILE_CHIP = {
  pdf: { icon: IconFileTypePdf, bg: "bg-[#fff0f0]", color: "text-[#c0392b]" },
  docx: { icon: IconFileTypeDoc, bg: "bg-[#e8f0fb]", color: "text-[#2980b9]" },
  pptx: { icon: IconFileTypePpt, bg: "bg-[#fff3e0]", color: "text-[#e67e22]" },
};

export default function TeacherCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("Materials");
  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadWarning, setUploadWarning] = useState("");
  const [replacingId, setReplacingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [quizzes, setQuizzes] = useState([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(30);
  const [questions, setQuestions] = useState([BLANK_QUESTION()]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [resultsQuizId, setResultsQuizId] = useState("");
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

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
    setActiveTab("Materials");
    setError("");
    setResultsQuizId("");
    setResults([]);
    setMarkingSession(null);
    setMaterials([]); // clear immediately so a course switch never shows the previous course's list
    setQuizzes([]);
    setAttendanceSessions([]);
    setMaterials(await getMaterials(course._id));
    const qs = await listQuizzesForCourse(course._id);
    setQuizzes(qs);
    const attendance = await listAttendanceSessions(course._id);
    setAttendanceSessions(attendance.sessions);
    setAttendanceOverall(attendance.overall);
  }

  async function loadResults(quizId) {
    setResultsQuizId(quizId);
    if (!quizId) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      setResults(await getAttemptsForQuiz(quizId));
    } finally {
      setLoadingResults(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === "Results" && !resultsQuizId && quizzes.length > 0) {
      loadResults(quizzes[0]._id);
    }
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

  async function doUpload(chosenFile) {
    if (!chosenFile || !selectedCourse) return;
    setUploading(true);
    setError("");
    setUploadWarning("");
    try {
      const uploaded = await uploadMaterial(selectedCourse._id, chosenFile, title);
      if (uploaded.textExtractionWarning) {
        setUploadWarning(`"${uploaded.title}": ${uploaded.textExtractionWarning}`);
      }
      setTitle("");
      setFile(null);
      setMaterials(await getMaterials(selectedCourse._id));
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleUpload(e) {
    e.preventDefault();
    doUpload(file);
    e.target.reset();
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) doUpload(dropped);
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

  if (loading) return <LoadingState label="Loading courses…" />;

  const errorBanner = error && (
    <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-input px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
      {error}
    </div>
  );

  // ── Course grid (no course selected) ──
  if (!selectedCourse) {
    return (
      <div className="space-y-5">
        {errorBanner}
        <h2 className="text-[15px] font-bold text-navy">My Courses</h2>
        {courses.length === 0 ? (
          <Card>
            <EmptyState icon="📚" title="No courses assigned yet." />
          </Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {courses.map((c) => (
              <CourseCard
                key={c._id}
                code={c.code}
                name={c.title}
                subtitle={c.description}
                onClick={() => openCourse(c)}
                actions={
                  <Button
                    size="sm"
                    className="w-full justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCourse(c);
                    }}
                  >
                    <IconFolderOpen size={15} />
                    Open
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Course detail ──
  return (
    <div className="space-y-4">
      {errorBanner}

      <button
        onClick={() => setSelectedCourse(null)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-navy transition-colors duration-150"
      >
        <IconArrowLeft size={15} /> Back to My Courses
      </button>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <code className="text-sm font-mono font-bold bg-[#f0f4fa] text-text-main px-2 py-0.5 rounded">
            {selectedCourse.code}
          </code>
          <h2 className="text-xl font-bold text-navy">{selectedCourse.title}</h2>
        </div>
        {selectedCourse.description && <p className="text-[13px] text-text-muted">{selectedCourse.description}</p>}
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={handleTabChange} />

      {activeTab === "Materials" && (
        <Card>
          <form
            onSubmit={handleUpload}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-card p-8 text-center mb-4 transition-colors duration-200 ${
              dragActive ? "border-navy-light bg-badge-blue-bg" : "border-line"
            }`}
          >
            <IconCloudUpload size={36} stroke={1.5} className="mx-auto text-text-muted mb-2" />
            <div className="text-sm font-semibold text-text-main mb-1">Drag &amp; drop lecture files here</div>
            <div className="text-xs text-text-muted mb-3">PDF, DOCX, PPTX up to 20MB</div>
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} py-1.5`}
              />
              <input
                type="file"
                accept=".pdf,.pptx,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-xs"
              />
              <Button type="submit" size="sm" disabled={uploading || !file}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </form>

          {uploadWarning && (
            <div className="bg-badge-amber-bg text-badge-amber-text text-[11px] rounded-input px-3 py-2 mb-3 animate-[fadeIn_0.15s_ease-in]">
              ⚠ {uploadWarning}
            </div>
          )}

          {materials.length === 0 ? (
            <EmptyState icon="📄" title="No materials uploaded yet." />
          ) : (
            <div>
              {materials.map((m) => {
                const chip = FILE_CHIP[m.fileType] || FILE_CHIP.pdf;
                const ChipIcon = chip.icon;
                return (
                  <div key={m._id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] border border-line mb-2 bg-white">
                    <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 ${chip.bg} ${chip.color}`}>
                      <ChipIcon size={18} stroke={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-text-main flex items-center gap-1.5 truncate">
                        {m.title}
                        {m.textExtractionWarning && (
                          <Badge variant="amber" title={m.textExtractionWarning} className="cursor-help flex-shrink-0">
                            ⚠ no readable text
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted uppercase">
                        {m.fileType} · {(m.fileSize / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <IconButton onClick={() => downloadMaterial(m._id, m.fileName)} title="Download">
                      <IconDownload size={16} />
                    </IconButton>
                    <label className="p-1.5 rounded-input text-text-muted hover:bg-bg-page hover:text-navy transition-colors duration-150 cursor-pointer inline-flex items-center justify-center">
                      <IconRefresh size={16} className={replacingId === m._id ? "animate-spin" : ""} />
                      <input
                        type="file"
                        accept=".pdf,.pptx,.docx"
                        className="hidden"
                        disabled={replacingId === m._id}
                        onChange={(e) => {
                          const selected = e.target.files[0];
                          e.target.value = "";
                          handleReplace(m._id, selected);
                        }}
                      />
                    </label>
                    <IconButton danger onClick={() => handleDelete(m._id)} title="Delete">
                      <IconTrash size={16} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "Quizzes" && (
        <div className="space-y-5">
          <div className="bg-[#f8faff] border-[1.5px] border-badge-blue-bg rounded-card p-[18px]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-navy mb-3.5">
              <IconSparkles size={16} className="text-navy-light" />
              AI Quiz Generation
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-main mb-1.5">
                  Source Material
                </label>
                <select
                  className={`w-full bg-white ${inputClass}`}
                  value={generateMaterialId}
                  onChange={(e) => setGenerateMaterialId(e.target.value)}
                >
                  <option value="">Select material…</option>
                  {materials.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-main mb-1.5">
                  Questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className={`w-full ${inputClass}`}
                  value={generateNumQuestions}
                  onChange={(e) => setGenerateNumQuestions(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !generateMaterialId}
                  className="w-full justify-center"
                >
                  <IconSparkles size={15} />
                  {generating ? "Generating…" : "Generate with AI"}
                </Button>
              </div>
            </div>
            {materials.length === 0 && (
              <p className="text-[11px] text-text-muted">Upload a material first to enable AI generation.</p>
            )}
          </div>

          <Card>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[13px] font-semibold text-text-main">Quizzes</h3>
              <Button
                size="sm"
                variant={showQuizForm ? "secondary" : "primary"}
                onClick={() => setShowQuizForm((v) => !v)}
              >
                {!showQuizForm && <IconPlus size={14} />}
                {showQuizForm ? "Cancel" : "New Quiz"}
              </Button>
            </div>

            {showQuizForm && (
              <form onSubmit={handleCreateQuiz} className="border border-line rounded-card p-3.5 mb-4 space-y-3 animate-[fadeIn_0.15s_ease-in]">
                <div className="flex gap-2">
                  <input
                    className={`flex-1 ${inputClass}`}
                    placeholder="Quiz title"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    className={`w-32 ${inputClass}`}
                    placeholder="Minutes"
                    value={quizDuration}
                    onChange={(e) => setQuizDuration(e.target.value)}
                    required
                  />
                </div>

                {questions.map((q, qi) => (
                  <div key={qi} className="border border-line rounded-[6px] p-3 space-y-2 bg-bg-page">
                    <div className="flex items-center gap-2">
                      <select
                        className={`bg-white ${inputClass}`}
                        value={q.type}
                        onChange={(e) => updateQuestion(qi, { type: e.target.value })}
                      >
                        <option value="mcq">Multiple choice</option>
                        <option value="subjective">Subjective (manually graded)</option>
                      </select>
                      <input
                        className={`flex-1 ${inputClass}`}
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
                      className={`w-48 ${inputClass} px-2 py-1 text-[11px]`}
                      placeholder="Topic (optional, e.g. Arrays)"
                      value={q.topic || ""}
                      onChange={(e) => updateQuestion(qi, { topic: e.target.value })}
                      maxLength={60}
                    />

                    {q.type === "subjective" ? (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-muted">Max score:</label>
                        <input
                          type="number"
                          min="1"
                          className={`w-20 ${inputClass} px-2 py-1`}
                          value={q.maxScore}
                          onChange={(e) => updateQuestion(qi, { maxScore: Number(e.target.value) })}
                          required
                        />
                        <p className="text-[10px] text-text-muted">
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
                                className={`flex-1 ${inputClass} px-2 py-1`}
                                placeholder={`Option ${oi + 1}`}
                                value={opt}
                                onChange={(e) => updateOption(qi, oi, e.target.value)}
                                required
                              />
                            </label>
                          ))}
                        </div>
                        <p className="text-[10px] text-text-muted">Select the radio button next to the correct option.</p>
                      </>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <button type="button" onClick={addQuestion} className="text-xs text-navy-light hover:underline">
                    + Add another question
                  </button>
                  <Button type="submit" disabled={creatingQuiz}>
                    {creatingQuiz ? "Creating…" : "Create Quiz"}
                  </Button>
                </div>
              </form>
            )}

            {quizzes.length === 0 ? (
              <EmptyState icon="📝" title="No quizzes yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Quiz Title
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Duration
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Status
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizzes.map((q) => (
                      <tr key={q._id} className="hover:bg-bg-page">
                        <td className="px-3 py-2.5 border-b border-[#f1f3f6] font-semibold text-text-main">{q.title}</td>
                        <td className="px-3 py-2.5 border-b border-[#f1f3f6] text-text-muted">{q.durationMinutes} min</td>
                        <td className="px-3 py-2.5 border-b border-[#f1f3f6]">
                          <Badge variant={q.isPublished ? "green" : "amber"}>{q.isPublished ? "Published" : "Draft"}</Badge>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#f1f3f6]">
                          <div className="flex items-center gap-1">
                            <IconButton onClick={() => handleTogglePublish(q)} title={q.isPublished ? "Unpublish" : "Publish"}>
                              {q.isPublished ? <IconEyeOff size={16} /> : <IconSend size={16} />}
                            </IconButton>
                            <button
                              onClick={() => {
                                setActiveTab("Results");
                                loadResults(q._id);
                              }}
                              className="text-xs text-navy-light hover:underline"
                            >
                              Results
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "Attendance" && (
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[13px] font-semibold text-text-main">
              Sessions
              {attendanceOverall?.averageAttendanceRate != null && (
                <span className="text-xs text-text-muted font-normal ml-2">
                  ({attendanceOverall.averageAttendanceRate}% average)
                </span>
              )}
            </h3>
            <Button size="sm" variant={showSessionForm ? "secondary" : "primary"} onClick={() => setShowSessionForm((s) => !s)}>
              {!showSessionForm && <IconCalendarPlus size={14} />}
              {showSessionForm ? "Cancel" : "New Session"}
            </Button>
          </div>

          {showSessionForm && (
            <form onSubmit={handleCreateSession} className="flex items-center gap-2 mb-4 border border-line rounded-card p-3.5 animate-[fadeIn_0.15s_ease-in]">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className={inputClass}
                required
              />
              <input
                type="text"
                placeholder="Topic (optional)"
                value={sessionTopic}
                onChange={(e) => setSessionTopic(e.target.value)}
                className={`flex-1 ${inputClass}`}
              />
              <Button type="submit" disabled={creatingSession} variant="secondary">
                {creatingSession ? "Creating…" : "Create"}
              </Button>
            </form>
          )}

          {markingSession ? (
            <div className="border border-line rounded-card p-3.5 animate-[fadeIn_0.15s_ease-in]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-semibold text-text-main">
                  Mark attendance — {new Date(markingSession.date).toLocaleDateString()}
                  {markingSession.topic && ` (${markingSession.topic})`}
                </h4>
                <button onClick={() => setMarkingSession(null)} className="text-xs text-text-muted hover:underline">
                  Close
                </button>
              </div>
              <div className="space-y-1 mb-3">
                {markingRecords.map((r) => (
                  <div key={r._id} className="flex items-center justify-between text-[13px] border-b border-[#f1f3f6] py-1.5">
                    <span className="text-text-main">{r.student.name}</span>
                    <select
                      value={r.status}
                      onChange={(e) => updateRecordStatus(r.student._id, e.target.value)}
                      className={`text-xs border rounded-input px-2 py-1 transition-colors duration-150 ${
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
              <Button onClick={handleSaveMarks} disabled={savingMarks}>
                {savingMarks ? "Saving…" : "Save Attendance"}
              </Button>
            </div>
          ) : attendanceSessions.length === 0 ? (
            <EmptyState icon="🗓️" title="No sessions recorded yet." />
          ) : (
            <div className="space-y-1">
              {attendanceSessions.map((s) => (
                <div
                  key={s._id}
                  onClick={() => handleOpenSession(s._id)}
                  className="flex items-center justify-between text-[13px] border-b border-[#f1f3f6] py-2.5 cursor-pointer transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
                >
                  <div>
                    <div className="text-text-main font-semibold">{new Date(s.date).toLocaleDateString()}</div>
                    {s.topic && <div className="text-xs text-text-muted">{s.topic}</div>}
                  </div>
                  <span className="text-xs text-text-muted">
                    {s.presentCount}/{s.totalStudents} present
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "Results" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-[13px] font-medium text-text-main whitespace-nowrap">Select Quiz:</label>
            <select
              className={`max-w-[300px] bg-white ${inputClass}`}
              value={resultsQuizId}
              onChange={(e) => loadResults(e.target.value)}
            >
              <option value="">Select a quiz…</option>
              {quizzes.map((q) => (
                <option key={q._id} value={q._id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>

          <Card>
            {loadingResults ? (
              <LoadingState label="Loading results…" />
            ) : !resultsQuizId ? (
              <EmptyState icon="🗒️" title="Select a quiz above to view results." />
            ) : results.length === 0 ? (
              <EmptyState icon="🗒️" title="No attempts yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Student
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Score
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Percentage
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const pct = r.maxScore ? Math.round((r.score / r.maxScore) * 100) : null;
                      return (
                        <tr key={r._id} className="hover:bg-bg-page">
                          <td className="px-3 py-2.5 border-b border-[#f1f3f6] font-semibold text-text-main">
                            {r.student?.name}
                          </td>
                          <td className="px-3 py-2.5 border-b border-[#f1f3f6]">
                            {!r.submittedAt ? (
                              <span className="text-text-muted">In progress</span>
                            ) : (
                              <strong>
                                {r.score}/{r.maxScore}
                              </strong>
                            )}
                          </td>
                          <td className="px-3 py-2.5 border-b border-[#f1f3f6]">
                            {pct !== null && (
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1 h-1.5 bg-[#e9ecef] rounded-full overflow-hidden min-w-[60px]">
                                  <div
                                    className={`h-full rounded-full ${
                                      pct >= 70 ? "bg-success" : pct >= 50 ? "bg-[#f39c12]" : "bg-badge-red-text"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-text-muted">{pct}%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 border-b border-[#f1f3f6]">
                            {!r.submittedAt ? (
                              <span className="text-text-muted text-xs">—</span>
                            ) : r.gradingComplete ? (
                              <Badge variant="green">Graded</Badge>
                            ) : (
                              <Badge variant="amber">Pending Review</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
