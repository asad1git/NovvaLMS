/**
 * Replaces bare "No X yet." gray text with a bit more visual presence —
 * used wherever a list/table genuinely has nothing to show yet.
 */
export default function EmptyState({ icon = "📭", title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <span className="text-3xl mb-2 opacity-50">{icon}</span>
      <p className="text-xs font-medium text-gray-600">{title}</p>
      {subtitle && <p className="text-[11px] text-gray-400 mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}
