import { useEffect, useState } from "react";
import { listCourses, getMaterials, uploadMaterial, deleteMaterial, downloadMaterial } from "../api/courses";
import {
  listQuizzesForCourse,
  createQuiz,
  setQuizPublished,
  getAttemptsForQuiz,
} from "../api/quizzes";

const BLANK_QUESTION = () => ({
  type: "mcq",
  text: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  maxScore: 5,
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

  const [quizzes, setQuizzes] = useState([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(30);
  const [questions, setQuestions] = useState([BLANK_QUESTION()]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [results, setResults] = useState([]);

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
    setMaterials([]); // clear immediately so a course switch never shows the previous course's list
    setQuizzes([]);
    setMaterials(await getMaterials(course._id));
    setQuizzes(await listQuizzesForCourse(course._id));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !selectedCourse) return;
    setUploading(true);
    setError("");
    try {
      await uploadMaterial(selectedCourse._id, file, title);
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

          <div className="space-y-1">
            {materials.map((m) => (
              <div key={m._id} className="flex items-center justify-between text-xs border-b border-gray-100 py-2">
                <div>
                  <div className="text-gray-900 font-medium">{m.title}</div>
                  <div className="text-[11px] text-gray-400 uppercase">
                    {m.fileType} · {(m.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => downloadMaterial(m._id, m.fileName)} className="text-navy-light hover:underline">
                    Download
                  </button>
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
    </div>
  );
}
