// Background/border color per variant — a `className` override for these
// same properties would silently lose to whichever rule Tailwind happens to
// emit later in its compiled stylesheet, since class *order in the string*
// doesn't control CSS cascade order. A variant prop sidesteps that entirely.
const VARIANTS = {
  default: "bg-white border-gray-200",
  danger: "bg-badge-red-bg border-badge-red-text/20",
  warning: "bg-badge-amber-bg border-badge-amber-text/20",
  success: "bg-badge-green-bg border-badge-green-text/20",
};

/**
 * The bordered-card container used everywhere — now with a subtle resting
 * shadow (shadow-card) instead of a flat border only, and an optional lift
 * on hover for cards that are actually clickable. `className` is for
 * layout/spacing overrides only (grid/margin/etc.) — use `variant` for
 * color, never fight the cascade with a conflicting bg or border color class.
 */
export default function Card({
  children,
  className = "",
  variant = "default",
  hoverable = false,
  padding = "p-5",
  as: As = "div",
  ...props
}) {
  return (
    <As
      className={`border rounded-card shadow-card ${VARIANTS[variant] || VARIANTS.default} ${padding} ${
        hoverable ? "transition-shadow duration-150 hover:shadow-card-hover cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}
