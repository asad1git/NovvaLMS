const VARIANTS = {
  green: "bg-badge-green-bg text-badge-green-text",
  blue: "bg-badge-blue-bg text-badge-blue-text",
  amber: "bg-badge-amber-bg text-badge-amber-text",
  red: "bg-badge-red-bg text-badge-red-text",
  gray: "bg-gray-100 text-gray-600",
};

/**
 * Small pill label reusing the locked badge color tokens from
 * tailwind.config.js — never invent a new color here, add a variant that
 * maps to an existing token instead.
 */
export default function Badge({ variant = "gray", children, className = "", title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${
        VARIANTS[variant] || VARIANTS.gray
      } ${className}`}
    >
      {children}
    </span>
  );
}
