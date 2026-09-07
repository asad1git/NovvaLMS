/**
 * Replaces bare "Loading…" text with a small spinner — used at the top
 * level of a page while its first data fetch is in flight.
 */
export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 py-10 justify-center">
      <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-navy-light rounded-full animate-spin" />
      {label}
    </div>
  );
}
