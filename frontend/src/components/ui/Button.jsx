// Exact spec from design-system/*.html's .btn / .btn-primary / .btn-sec /
// .btn-success / .btn-danger / .btn-ghost / .btn-sm.
const VARIANTS = {
  primary: "bg-navy text-white hover:bg-navy-dark",
  secondary: "bg-badge-blue-bg text-navy-light hover:bg-[#d0e6f8]",
  success: "bg-badge-green-bg text-success hover:bg-[#c8e8b4]",
  danger: "bg-badge-red-bg text-badge-red-text hover:bg-[#fad5d5]",
  ghost: "bg-transparent text-text-muted border border-line hover:bg-bg-page",
};

const SIZES = {
  md: "text-[13px] px-4 py-2",
  sm: "text-xs px-2.5 py-1.5",
  lg: "text-sm px-5 py-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center gap-1.5 font-medium rounded-input whitespace-nowrap " +
    "transition-[background,transform] duration-150 active:scale-[0.98] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-light focus-visible:ring-offset-1 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${SIZES[size] || SIZES.md} ${VARIANTS[variant] || VARIANTS.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
