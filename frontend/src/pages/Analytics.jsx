import { useEffect, useState } from "react";
import {
  IconChecklist,
  IconChartLine,
  IconTrophy,
  IconAlertTriangle,
  IconCircleCheck,
  IconChartBar,
  IconInfoCircle,
} from "@tabler/icons-react";
import { getMyAnalytics } from "../api/analytics";
import { listCourses } from "../api/courses";
import { Card, StatCard, EmptyState, LoadingState } from "../components/ui";

function barColor(pct) {
  if (pct >= 70) return "linear-gradient(90deg,#27ae60,#1e8449)";
  if (pct >= 50) return "linear-gradient(90deg,#f39c12,#e67e22)";
  return "linear-gradient(90deg,#e74c3c,#a32d2d)";
}

function valueColor(pct) {
  if (pct >= 70) return "#1E8449";
  if (pct >= 50) return "#f39c12";
  return "#A32D2D";
}

// Chronological (ascending) score-trend SVG — no charting library, built the
// same way the reference does (hand-drawn grid/polyline/points), just as
// real React SVG elements rather than a string-built <svg>.
function TrendChart({ attempts }) {
  const points = attempts.filter((a) => a.percentage !== null).slice().reverse(); // oldest first
  if (points.length === 0) {
    return <EmptyState icon="📈" title="No scored quizzes yet" subtitle="Your score trend appears once quizzes are graded." />;
  }

  const W = 640;
  const H = 220;
  const PL = 36;
  const PR = 16;
  const PT = 14;
  const PB = 30;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const xOf = (i) => PL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yOf = (pct) => PT + innerH - (pct / 100) * innerH;

  const linePoints = points.map((p, i) => `${xOf(i)},${yOf(p.percentage)}`).join(" ");
  const areaPoints = `${xOf(0)},${yOf(0)} ${linePoints} ${xOf(points.length - 1)},${yOf(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PL} y1={yOf(v)} x2={W - PR} y2={yOf(v)} stroke="#e9ecef" strokeWidth="1" />
          <text x={PL - 6} y={yOf(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {v}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        i % Math.ceil(points.length / 8 || 1) === 0 || i === points.length - 1 ? (
          <text key={p.attemptId} x={xOf(i)} y={H - PB + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">
            Q{i + 1}
          </text>
        ) : null
      )}
      <polygon points={areaPoints} fill="#2E75B6" fillOpacity="0.07" />
      <polyline points={linePoints} fill="none" stroke="#2E75B6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.attemptId}>
          <circle cx={xOf(i)} cy={yOf(p.percentage)} r="5" fill="#2E75B6" stroke="white" strokeWidth="2.5" />
          <text x={xOf(i)} y={yOf(p.percentage) - 10} textAnchor="middle" fontSize="11" fill="#2E75B6" fontWeight="700">
            {p.percentage}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [courseList, analytics] = await Promise.all([listCourses(), getMyAnalytics()]);
        setCourses(courseList);
        setData(analytics);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function selectCourse(id) {
    setCourseId(id);
    setLoading(true);
    try {
      setData(await getMyAnalytics(id || undefined));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  const { topics, overall, attempts } = data || {};
  const bestScore = attempts?.length ? Math.max(0, ...attempts.filter((a) => a.percentage !== null).map((a) => a.percentage)) : 0;
  const activeCourseLabel = courseId ? courses.find((c) => c._id === courseId)?.title : "all your courses";

  return (
    <div className="flex -m-6" style={{ height: "calc(100vh - 58px)" }}>
      {/* Course filter sidebar */}
      <div className="w-[220px] min-w-[220px] bg-white border-r border-line flex flex-col overflow-hidden flex-shrink-0">
        <div className="px-[18px] pt-4 pb-3.5 border-b border-line flex-shrink-0">
          <div className="text-[13px] font-bold text-navy mb-0.5">Course Filter</div>
          <div className="text-[11px] text-text-muted">Filter analytics by course</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5">
          <div
            onClick={() => selectCourse("")}
            className={`px-3 py-2.5 rounded-card cursor-pointer transition-colors duration-150 border-[1.5px] mb-1 ${
              !courseId ? "bg-badge-blue-bg border-navy-light" : "border-transparent hover:bg-bg-page"
            }`}
          >
            <span className={`text-[13px] ${!courseId ? "font-semibold text-navy" : "font-medium text-text-main"}`}>
              All Courses
            </span>
          </div>
          {courses.map((c) => (
            <div
              key={c._id}
              onClick={() => selectCourse(c._id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-card cursor-pointer transition-colors duration-150 border-[1.5px] mb-1 ${
                courseId === c._id ? "bg-badge-blue-bg border-navy-light" : "border-transparent hover:bg-bg-page"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-navy-light flex-shrink-0" />
              <div className="min-w-0">
                <div className={`text-[13px] truncate ${courseId === c._id ? "font-semibold text-navy" : "font-medium text-text-main"}`}>
                  {c.code}
                </div>
                <div className="text-[10px] text-text-muted truncate">{c.title}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-3.5 py-3 border-t border-line flex-shrink-0">
          <div className="flex items-start gap-1.5 text-[11px] text-text-muted leading-[1.5]">
            <IconInfoCircle size={14} className="text-navy-light flex-shrink-0 mt-px" />
            Data reflects completed quizzes and teacher-approved grades only.
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0">
        {loading || !data ? (
          <LoadingState />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                icon={IconChecklist}
                tone="blue"
                value={overall.totalAttempts}
                label="Quizzes Attempted"
                trend={{ label: `+${overall.totalAttempts}`, tone: "up" }}
              />
              <StatCard
                icon={IconChartLine}
                tone="success"
                value={overall.averagePercentage !== null ? `${overall.averagePercentage}%` : "—"}
                valueColor={overall.averagePercentage !== null ? valueColor(overall.averagePercentage) : undefined}
                label="Overall Average"
                trend={{ label: overall.averagePercentage >= 70 ? "Good" : "Below avg", tone: overall.averagePercentage >= 70 ? "up" : "down" }}
              />
              <StatCard
                icon={IconTrophy}
                tone="amber"
                value={`${bestScore}%`}
                valueColor="#633806"
                label="Best Score"
                trend={{ label: "Best", tone: "up" }}
              />
              <StatCard
                icon={overall.weakTopics.length ? IconAlertTriangle : IconCircleCheck}
                tone={overall.weakTopics.length ? "danger" : "success"}
                value={overall.weakTopics.length}
                valueColor={overall.weakTopics.length ? "#A32D2D" : "#1E8449"}
                label="Weak Topics"
                trend={{
                  label: overall.weakTopics.length ? `${overall.weakTopics.length} found` : "None!",
                  tone: overall.weakTopics.length ? "down" : "up",
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <div className="flex items-center gap-1.5 mb-1">
                  <IconChartBar size={15} className="text-navy-light" />
                  <h2 className="text-[13px] font-bold text-navy">Topic-wise Performance</h2>
                </div>
                <p className="text-[11px] text-text-muted mb-3.5">Score per topic across attempted quizzes</p>
                <div className="flex gap-3.5 mb-3.5 flex-wrap">
                  <LegendChip color="#1E8449" label="≥70% Good" />
                  <LegendChip color="#f39c12" label="50–69% Average" />
                  <LegendChip color="#A32D2D" label="<50% Weak" />
                </div>
                {topics.length === 0 ? (
                  <EmptyState icon="📊" title="No topic analytics yet" subtitle="This appears once your quizzes are scored." />
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {topics.map((t) => (
                      <div key={t.topic} className="flex items-center gap-2.5">
                        <div className="w-[130px] flex-shrink-0 text-xs font-medium text-text-main truncate" title={t.topic}>
                          {t.topic}
                        </div>
                        <div className="flex-1 h-3 bg-[#e9ecef] rounded-full overflow-visible relative">
                          <div
                            className="h-full rounded-full transition-[width] duration-500 ease-out"
                            style={{ width: `${Math.min(100, t.percentage)}%`, background: barColor(t.percentage) }}
                          />
                          <span
                            className="absolute -right-9 top-1/2 -translate-y-1/2 text-[11px] font-bold whitespace-nowrap"
                            style={{ color: valueColor(t.percentage) }}
                          >
                            {t.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-1.5 mb-1">
                  <IconChartLine size={15} className="text-navy" />
                  <h2 className="text-[13px] font-bold text-navy">Score Trend</h2>
                </div>
                <p className="text-[11px] text-text-muted mb-3.5">
                  {courseId ? "Score across quiz attempts" : "All courses — quiz-by-quiz progression"}
                </p>
                <TrendChart attempts={attempts} />
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[15px] font-bold text-navy">
                  <IconAlertTriangle size={16} className="text-badge-red-text" />
                  Weak Topics
                  {overall.weakTopics.length > 0 && (
                    <span className="bg-badge-red-bg text-badge-red-text text-[11px] font-bold rounded-full px-2.5 py-0.5">
                      {overall.weakTopics.length} found
                    </span>
                  )}
                </div>
              </div>

              {overall.weakTopics.length === 0 ? (
                <Card variant="success" className="flex items-center gap-4">
                  <div className="w-[52px] h-[52px] bg-[#c8e6b8] rounded-full flex items-center justify-center flex-shrink-0">
                    <IconTrophy size={24} className="text-success" />
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-success mb-1">No weak topics detected! 🎉</div>
                    <div className="text-[13px] text-[#3d6b30]">
                      You are performing well across {activeCourseLabel}. Keep up the great work and maintain your
                      scores above 70%!
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
                  {overall.weakTopics.map((t) => (
                    <div
                      key={t.topic}
                      className="bg-white border-[1.5px] border-[#f5c2c2] rounded-card p-[18px] shadow-[0_1px_4px_rgba(163,45,45,0.07)] transition-shadow duration-200 hover:shadow-[0_3px_14px_rgba(163,45,45,0.12)]"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm font-bold text-badge-red-text">{t.topic}</div>
                        <div className="text-2xl font-extrabold text-badge-red-text">{t.percentage}%</div>
                      </div>
                      <div className="h-[7px] bg-[#fad5d5] rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-badge-red-text rounded-full transition-[width] duration-500 ease-out"
                          style={{ width: `${t.percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-[#7a2020] bg-[#fff5f5] rounded-[5px] px-3 py-2.5 leading-[1.55] border-l-[3px] border-l-[#f5c2c2]">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-badge-red-text mb-1">
                          Study Tip
                        </div>
                        Review the related lecture material for this topic and ask Novva Assistant to explain the
                        concepts you're missing.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendChip({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  );
}
