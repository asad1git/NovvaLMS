import Card from "./Card";

// Exact spec from design-system/*.html's .stat-card / .stat-icon (44px,
// radius 10px) / .stat-val (26px/700) / .stat-lbl (12px/muted). The
// reference actually specifies a second, vertical stat-card shape on the
// Analytics screen (icon+trend row, then value, then label) — deliberately
// not reproduced here: this app uses ONE stat-card shape everywhere for
// real cross-page consistency rather than matching two different reference
// layouts. `trend` (used only by Analytics today) renders as a small pill
// next to the value instead of requiring a second card shape.
const TONES = {
  blue: { bg: "bg-badge-blue-bg", color: "text-navy-light" },
  success: { bg: "bg-badge-green-bg", color: "text-success" },
  amber: { bg: "bg-badge-amber-bg", color: "text-badge-amber-text" },
  danger: { bg: "bg-badge-red-bg", color: "text-badge-red-text" },
  navy: { bg: "bg-[#e8f0fb]", color: "text-navy" },
};

const TREND_TONES = {
  up: "bg-badge-green-bg text-success",
  down: "bg-badge-red-bg text-badge-red-text",
};

/**
 * `icon` is a Tabler icon component (e.g. `IconBooks` from
 * @tabler/icons-react), rendered inside a 44px colored chip — never an
 * emoji, per the reference design. `trend` is optional: `{ label, tone }`
 * ("up" | "down") renders a small pill beside the value. `valueColor` is an
 * optional literal hex for the value text — always inline `style`, never a
 * dynamically-built `text-[${hex}]` class: Tailwind's JIT scans source text
 * for literal class strings, so a runtime-interpolated arbitrary-value
 * class never makes it into the compiled CSS.
 */
export default function StatCard({ label, value, valueColor, icon: Icon, tone = "blue", trend }) {
  const t = TONES[tone] || TONES.blue;
  return (
    <Card className="flex items-center gap-3.5" padding="p-[18px_20px]">
      {Icon && (
        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0 ${t.bg}`}>
          <Icon size={20} stroke={1.9} className={t.color} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold leading-none text-text-main" style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </div>
          {trend && (
            <span
              className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0 ${
                TREND_TONES[trend.tone] || TREND_TONES.up
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted mt-[3px]">{label}</div>
      </div>
    </Card>
  );
}
