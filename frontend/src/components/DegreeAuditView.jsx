import { IconSchool, IconCircleCheck, IconCircleDashed, IconTrophy } from "@tabler/icons-react";
import { Card, StatCard, EmptyState } from "./ui";

const STANDING_TONE = {
  "Good Standing": "success",
  "Academic Probation": "amber",
  "Academic Suspension": "danger",
};

/**
 * Pure presentational — takes the exact shape computeDegreeAudit returns
 * and renders it. Used by both DegreeAudit.jsx (a student's own page,
 * GET /api/degree-audit/me) and AdvisorDashboard.jsx's advisee view
 * (GET /api/advisor-links/:studentId/degree-audit) — identical data shape,
 * identical rendering need, so this is the one place it's built.
 */
export default function DegreeAuditView({ audit }) {
  if (!audit.hasProgram) {
    return (
      <Card>
        <EmptyState
          icon={<IconSchool size={32} className="text-text-muted" />}
          title="No degree program assigned yet"
          subtitle="Contact your institution's admin to get assigned to a program."
        />
      </Card>
    );
  }

  const { program, completedRequired, remainingRequired, creditHoursEarned, cumulativeGpa, standing, readyToGraduate } = audit;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">{program.name} ({program.code})</h2>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            standing === "Good Standing"
              ? "bg-badge-green-bg text-badge-green-text"
              : standing === "Academic Probation"
              ? "bg-badge-amber-bg text-badge-amber-text"
              : "bg-badge-red-bg text-badge-red-text"
          }`}
        >
          {standing}
        </span>
      </div>

      {readyToGraduate && (
        <Card variant="success">
          <div className="flex items-center gap-2 text-badge-green-text font-semibold text-sm">
            <IconTrophy size={18} /> All degree requirements met — ready to graduate
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Cumulative GPA"
          value={cumulativeGpa ?? "—"}
          icon={IconSchool}
          tone={STANDING_TONE[standing] || "navy"}
        />
        <StatCard
          label="Credit Hours Earned"
          value={`${creditHoursEarned}/${program.totalCreditHoursRequired}`}
          icon={IconCircleCheck}
          tone="navy"
        />
        <StatCard
          label="Required Courses Done"
          value={`${completedRequired.length}/${completedRequired.length + remainingRequired.length}`}
          icon={IconCircleDashed}
          tone={remainingRequired.length === 0 ? "success" : "amber"}
        />
      </div>

      <Card>
        <h3 className="text-[13px] font-bold text-navy mb-3">Required Courses</h3>
        <div className="space-y-1">
          {completedRequired.map((c) => (
            <div key={c._id} className="flex items-center gap-2 text-xs border-b border-line py-1.5">
              <IconCircleCheck size={15} className="text-success flex-shrink-0" />
              <span className="text-text-main">{c.code} — {c.title}</span>
              <span className="text-text-muted ml-auto">{c.creditHours} credit hours</span>
            </div>
          ))}
          {remainingRequired.map((c) => (
            <div key={c._id} className="flex items-center gap-2 text-xs border-b border-line py-1.5">
              <IconCircleDashed size={15} className="text-text-muted flex-shrink-0" />
              <span className="text-text-main">{c.code} — {c.title}</span>
              <span className="text-text-muted ml-auto">{c.creditHours} credit hours</span>
            </div>
          ))}
          {completedRequired.length === 0 && remainingRequired.length === 0 && (
            <p className="text-xs text-text-muted">This program has no required courses configured.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
