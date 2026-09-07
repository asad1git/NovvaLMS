const VARIANTS = {
  primary: "bg-navy text-white hover:bg-navy-light focus-visible:ring-navy-light shadow-card",
  secondary:
    "bg-white text-navy border border-gray-200 hover:border-navy-light hover:bg-gray-50 focus-visible:ring-navy-light",
  danger:
    "bg-white text-badge-red-text border border-badge-red-text/30 hover:bg-badge-red-bg focus-visible:ring-badge-red-text",
  ghost: "text-navy-light hover:underline bg-transparent",
};

/**
 * Every button in the app should route through here so hover/active/focus/
 * disabled states stay consistent — previously each page hand-rolled its
 * own button className, so a hover or focus state existed on some buttons
 * and not others.
 */
export default function Button({ variant = "primary", className = "", children, disabled, type = "button", ...props }) {
  const base =
    "text-xs font-medium rounded px-4 py-2 transition-all duration-150 " +
    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  return (
    <button type={type} disabled={disabled} className={`${base} ${VARIANTS[variant] || VARIANTS.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
