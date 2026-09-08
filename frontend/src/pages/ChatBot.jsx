import { useEffect, useRef, useState } from "react";
import { IconRobot, IconSend, IconShieldCheck, IconInfoCircle, IconBook, IconMessageCircle } from "@tabler/icons-react";
import { listCourses } from "../api/courses";
import { getMessages, sendMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";

const SUGGESTED_QUESTIONS = [
  "What does this course cover?",
  "Where am I weak?",
  "What's been uploaded so far?",
];

// Course-switcher icon-chip colors — cycled deterministically since courses
// have no stored color/icon field.
const CHIP_COLORS = ["#2E75B6", "#1E8449", "#f39c12", "#8b6ac8", "#c0392b"];

// Renders the AI's light **bold** formatting as real React nodes (never
// dangerouslySetInnerHTML) — safe for both the AI's reply and a student's
// own typed message rendering through the same bubble.
function formatMessage(text) {
  return text.split("\n").map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={pi}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={pi}>{part}</span>
        )
      )}
    </span>
  ));
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ChatBot() {
  const { auth } = useAuth();
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
  }, [messages, sending]);

  async function doSend(question) {
    if (!question.trim() || !courseId) return;
    setDraft("");
    setSending(true);
    setError("");
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

  function handleSend(e) {
    e.preventDefault();
    doSend(draft.trim());
  }

  if (loading) return <div className="text-sm text-text-muted">Loading…</div>;

  const selectedCourse = courses.find((c) => c._id === courseId);

  return (
    <div className="flex -m-6" style={{ height: "calc(100vh - 58px)" }}>
      {/* Course switcher */}
      <div className="w-[220px] min-w-[220px] bg-white border-r border-line flex flex-col flex-shrink-0">
        <div className="px-[18px] pt-4 pb-3.5 border-b border-line flex-shrink-0">
          <div className="text-[13px] font-bold text-navy mb-0.5">My Courses</div>
          <div className="text-[11px] text-text-muted">Select a course to chat</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5">
          {courses.length === 0 && <p className="text-xs text-text-muted px-2 py-3">No enrolled courses.</p>}
          {courses.map((c, i) => {
            const active = c._id === courseId;
            return (
              <div
                key={c._id}
                onClick={() => setCourseId(c._id)}
                className={`flex items-start gap-2.5 p-3 rounded-card cursor-pointer transition-colors duration-150 border-[1.5px] mb-1.5 ${
                  active ? "bg-badge-blue-bg border-navy-light" : "border-transparent hover:bg-bg-page"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white"
                  style={{ background: CHIP_COLORS[i % CHIP_COLORS.length] }}
                >
                  <IconBook size={17} stroke={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-navy truncate">{c.code}</div>
                  <div className="text-[11px] text-text-muted leading-[1.35] truncate">{c.title}</div>
                  {active && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-success mt-1">
                      <span className="w-[5px] h-[5px] rounded-full bg-success" />
                      Active
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-3.5 py-3 border-t border-line flex-shrink-0">
          <div className="flex items-start gap-1.5 text-[11px] text-text-muted leading-[1.5]">
            <IconInfoCircle size={14} className="text-navy-light flex-shrink-0 mt-px" />
            <span>Answers are based solely on uploaded lecture materials for the selected course.</span>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-[22px] py-3.5 bg-white border-b border-line flex items-center justify-between flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] bg-navy rounded-full flex items-center justify-center flex-shrink-0 relative">
              <IconRobot size={19} className="text-white" />
              <span className="absolute bottom-0 right-0 w-[11px] h-[11px] bg-success rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-navy">
                {selectedCourse ? `${selectedCourse.code} AI Assistant` : "Novva Assistant"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Online · RAG-Powered {selectedCourse && `· ${selectedCourse.title}`}
              </div>
            </div>
          </div>
        </div>

        <div className="px-[22px] py-2.5 bg-[#fffdf0] border-b border-[#e8d98a] flex items-center gap-2 text-xs text-[#7a6020] flex-shrink-0">
          <IconShieldCheck size={15} className="text-[#c8a020] flex-shrink-0" />
          Responses are strictly grounded in uploaded course materials for your selected course.
        </div>

        {error && (
          <div className="bg-badge-red-bg text-badge-red-text text-xs px-[22px] py-2 animate-[fadeIn_0.15s_ease-in]">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto px-[22px] py-5 bg-bg-page flex flex-col gap-3.5">
          {messages.length === 0 && (
            <div className="flex gap-2.5 self-start max-w-[72%] animate-[fadeIn_0.2s_ease-out]">
              <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <IconRobot size={16} />
              </div>
              <div className="bg-white border border-line rounded-2xl rounded-bl-[4px] shadow-sm px-4 py-3.5 text-[13.5px] leading-[1.7] text-text-main">
                Hi! Ask me anything about {selectedCourse ? selectedCourse.title : "this course"} — I only answer from
                your real lecture materials and performance data.
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m._id}
              className={`flex gap-2.5 max-w-[72%] animate-[fadeIn_0.2s_ease-out] ${
                m.role === "user" ? "self-end flex-row-reverse" : "self-start"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[12px] font-bold ${
                  m.role === "user" ? "bg-badge-amber-text text-white" : "bg-navy text-white"
                }`}
              >
                {m.role === "user" ? initials(auth?.name) : <IconRobot size={16} />}
              </div>
              <div className="flex flex-col gap-1">
                <div
                  className={`rounded-2xl shadow-sm px-4 py-3 text-[13.5px] leading-[1.65] break-words ${
                    m.role === "user"
                      ? "bg-navy text-white rounded-br-[4px]"
                      : "bg-white border border-line text-text-main rounded-bl-[4px]"
                  }`}
                >
                  {formatMessage(m.content)}
                </div>
                {m.sources?.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-badge-blue-bg text-navy-light text-[11px] font-medium px-2.5 py-1 rounded-input border border-navy-light/20 self-start">
                    Source: {m.sources.map((s) => s.title).join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-2.5 self-start animate-[fadeIn_0.2s_ease-out]">
              <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <IconRobot size={16} />
              </div>
              <div className="bg-white border border-line rounded-2xl rounded-bl-[4px] shadow-sm px-4.5 py-3.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-[22px] pt-3 pb-1 bg-white border-t border-line flex-shrink-0">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Suggested Questions</div>
            <div className="flex gap-1.5 flex-wrap pb-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => doSend(q)}
                  disabled={sending || !courseId}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-bg-page border-[1.5px] border-line rounded-full text-xs font-medium text-text-main transition-colors duration-150 hover:bg-badge-blue-bg hover:border-navy-light hover:text-navy-light disabled:opacity-50"
                >
                  <IconMessageCircle size={13} />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="px-[22px] py-3.5 bg-white border-t border-line flex-shrink-0">
          <div className="flex items-end gap-2.5">
            <input
              className="flex-1 h-11 px-4 pr-4 border-[1.5px] border-line rounded-full text-[13.5px] text-text-main bg-[#fafbfc] outline-none transition-[border-color,box-shadow,background] duration-150 focus:border-navy-light focus:bg-white focus:ring-[3px] focus:ring-navy-light/10 placeholder:text-[#bdc5cf]"
              placeholder="Ask anything about your course material…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending || !courseId}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim() || !courseId}
              className="w-11 h-11 bg-navy rounded-full flex items-center justify-center text-white flex-shrink-0 transition-[background,transform] duration-150 hover:bg-navy-dark active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <IconSend size={17} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
