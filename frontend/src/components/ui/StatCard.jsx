import Card from "./Card";

// Exact spec from design-system/*.html's .stat-card / .stat-icon (44px,
// radius 10px) / .stat-val (26px/700) / .stat-lbl (12px/muted).
const TONES = {
  blue: { bg: "bg-badge-blue-bg", color: "text-navy-light" },
  success: { bg: "bg-badge-green-bg", color: "text-success" },
  amber: { bg: "bg-badge-amber-bg", color: "text-badge-amber-text" },
  danger: { bg: "bg-badge-red-bg", color: "text-badge-red-text" },
  navy: { bg: "bg-[#e8f0fb]", color: "text-navy" },
};

/**
 * `icon` is a Tabler icon component (e.g. `IconBooks` from
 * @tabler/icons-react), rendered inside a 44px colored chip — never an
 * emoji, per the reference design.
 */
export default function StatCard({ label, value, icon: Icon, tone = "blue", delta }) {
  const t = TONES[tone] || TONES.blue;
  return (
    <Card className="flex items-center gap-3.5" padding="p-[18px_20px]">
      {Icon && (
        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0 ${t.bg}`}>
          <Icon size={20} stroke={1.9} className={t.color} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-2xl font-bold text-text-main leading-none">{value}</div>
        <div className="text-xs text-text-muted mt-[3px]">{label}</div>
        {delta && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-success mt-1">{delta}</div>
        )}
      </div>
    </Card>
  );
}
