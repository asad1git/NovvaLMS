import Card from "./Card";

/**
 * The label+value stat tile pattern was duplicated with slightly different
 * markup across AdminOverview/TeacherOverview/StudentOverview/Analytics/
 * ParentDashboard/Attendance — one shared component now, so the elevated
 * styling (and any future tweak) applies everywhere at once.
 */
export default function StatCard({ label, value, accent = false, icon }) {
  return (
    <Card hoverable>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 mb-1 truncate">{label}</p>
          <p className={`text-2xl font-semibold ${accent ? "text-badge-red-text" : "text-gray-900"}`}>{value}</p>
        </div>
        {icon && <span className="text-lg opacity-60 flex-shrink-0">{icon}</span>}
      </div>
    </Card>
  );
}
