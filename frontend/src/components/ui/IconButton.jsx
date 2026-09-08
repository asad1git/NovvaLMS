// Exact spec from design-system/*.html's .icon-btn / .icon-btn.d — the
// icon-only table-row-action buttons (edit / publish / delete).
export default function IconButton({ children, danger = false, className = "", ...props }) {
  return (
    <button
      className={`p-1.5 rounded-input bg-transparent text-text-muted transition-colors duration-150 inline-flex items-center justify-center ${
        danger ? "hover:bg-badge-red-bg hover:text-badge-red-text" : "hover:bg-bg-page hover:text-navy"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
