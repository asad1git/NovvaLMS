import { useEffect, useRef, useState } from "react";
import { listCourses } from "../api/courses";
import { getMessages, sendMessage } from "../api/chat";

export default function ChatBot() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);

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
    setMessages([]);
    getMessages(courseId)
      .then(setMessages)
      .catch((err) => setError(err.response?.data?.message || "Failed to load chat history"));
  }, [courseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !courseId) return;
    const question = draft.trim();
    setDraft("");
    setSending(true);
    setError("");
    // Optimistic: show the student's question immediately, before the (slow) AI reply arrives.
    setMessages((prev) => [...prev, { _id: `pending-${Date.now()}`, role: "user", content: question }]);
    try {
      const { userMessage, assistantMessage } = await sendMessage(courseId, question);
      setMessages((prev) => [...prev.filter((m) => !String(m._id).startsWith("pending-")), userMessage, assistantMessage]);
    } catch (err) {
      setError(err.response?.data?.message || "The chatbot failed to respond");
      setMessages((prev) => prev.filter((m) => !String(m._id).startsWith("pending-")));
      setDraft(question);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 mb-3">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-card p-4 mb-3">
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
        <p className="text-[10px] text-gray-400 mt-2">
          Ask about this course's lecture materials, what's been uploaded, or your own quiz
          performance and weak topics — Novva Assistant only answers from your real data.
        </p>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-card p-4 overflow-y-auto mb-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500">
            Try "What does this course cover?", "Where am I weak?", or ask about the lecture
            material directly.
          </p>
        )}
        {messages.map((m) => (
          <div key={m._id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-card px-3 py-2 text-xs ${
                m.role === "user" ? "bg-navy text-white" : "bg-badge-blue-bg text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sources?.length > 0 && (
                <p className="text-[10px] mt-1 opacity-70">
                  Source: {m.sources.map((s) => s.title).join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-badge-blue-bg text-gray-500 rounded-card px-3 py-2 text-xs italic">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-xs"
          placeholder="Ask a question about this course…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending || !courseId}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim() || !courseId}
          className="bg-navy text-white text-xs font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
