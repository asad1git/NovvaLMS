import Card from "./Card";

// Exact spec from design-system/*.html's .course-card / .cc-header / .cc-body
// / .cc-stats / .cc-actions.
export default function CourseCard({ code, name, subtitle, stats = [], actions, onClick }) {
  return (
    <Card
      padding="p-0"
      hoverable={!!onClick}
      onClick={onClick}
      className="overflow-hidden flex flex-col"
    >
      <div className="px-[18px] pt-4 pb-3.5 border-b border-line">
        <div className="text-[11px] font-bold uppercase tracking-wide text-navy-light mb-1">{code}</div>
        <div className="text-[15px] font-bold text-text-main mb-0.5">{name}</div>
        {subtitle && <div className="text-xs text-text-muted">{subtitle}</div>}
      </div>
      <div className="px-[18px] pt-3.5 pb-3.5 flex flex-col gap-3.5 flex-1">
        {stats.length > 0 && (
          <div className="flex gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-lg font-bold ${s.accent ? "text-badge-amber-text" : "text-navy"}`}>{s.value}</div>
                <div
                  className={`text-[10px] uppercase tracking-wide ${s.accent ? "text-badge-amber-text" : "text-text-muted"}`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {actions && <div className="flex gap-2 mt-auto">{actions}</div>}
      </div>
    </Card>
  );
}
