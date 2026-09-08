// Background/border color per variant — a `className` override for these
// same properties would silently lose to whichever rule Tailwind happens to
// emit later in its compiled stylesheet, since class *order in the string*
// doesn't control CSS cascade order. A variant prop sidesteps that entirely.
// Danger/warning/success borders are solid pastel tones, NOT a translucent
// cut of the badge text color — border-badge-red-text/20 etc. looked correct
// in isolation but rendered as a barely-visible wash against these same
// light tinted backgrounds (a dark color at 20% opacity over a pale bg is
// still pale). Matched to colors already proven visible elsewhere in the
// app for the same purpose (e.g. Analytics.jsx's weak-topic cards use this
// exact pink for the same "danger" meaning) — a real bug caught after the
// normalization pass converted a previously-solid custom border onto this
// variant and the outline all but disappeared.
const VARIANTS = {
  default: "bg-white border-line",
  danger: "bg-badge-red-bg border-[#f5c2c2]",
  warning: "bg-badge-amber-bg border-[#e8c987]",
  success: "bg-badge-green-bg border-[#b7dca0]",
  // Light-blue tint for informational/AI-assist surfaces (e.g. the AI quiz
  // generation panel) — previously several pages hand-rolled this exact
  // bg-[#f8faff]/border-badge-blue-bg combination as a raw div instead of
  // going through Card, which is the same "className fighting the cascade"
  // problem the variant prop exists to avoid in the first place.
  info: "bg-[#f8faff] border-badge-blue-bg",
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
