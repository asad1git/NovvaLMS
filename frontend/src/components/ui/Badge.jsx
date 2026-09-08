// Exact spec from design-system/*.html's .badge (pill, 11px/600, 3px 10px)
// plus its per-status classes (.b-mcq, .b-subj, .b-mixed, .b-published, …).
const VARIANTS = {
  green: "bg-badge-green-bg text-badge-green-text",
  blue: "bg-badge-blue-bg text-badge-blue-text",
  amber: "bg-badge-amber-bg text-badge-amber-text",
  red: "bg-badge-red-bg text-badge-red-text",
  gray: "bg-[#f0f0f5] text-[#374151]",
};

export default function Badge({ variant = "gray", children, className = "", title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
        VARIANTS[variant] || VARIANTS.gray
      } ${className}`}
    >
      {children}
    </span>
  );
}
