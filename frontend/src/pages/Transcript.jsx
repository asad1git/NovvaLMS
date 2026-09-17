import { useEffect, useState } from "react";
import { IconFileCertificate, IconCalendarStats } from "@tabler/icons-react";
import { getMyTranscript } from "../api/transcript";
import { Card, StatCard, EmptyState, LoadingState } from "../components/ui";

export default function Transcript() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setData(await getMyTranscript());
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load transcript");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState label="Loading transcript…" />;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Cumulative GPA"
          value={data.cumulativeGpa !== null ? data.cumulativeGpa.toFixed(2) : "—"}
          icon={IconFileCertificate}
          tone="navy"
        />
        <StatCard label="Total Credit Hours" value={data.cumulativeCredits} icon={IconCalendarStats} tone="blue" />
      </div>

      {data.terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconFileCertificate size={32} className="text-text-muted" />}
            title="No finalized grades yet."
            subtitle="Grades appear here once your teacher finalizes them at the end of a course."
          />
        </Card>
      ) : (
        data.terms.map((t) => (
          <Card key={t.term._id}>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[13px] font-bold text-navy">{t.term.name}</h2>
              <div className="text-[13px] font-semibold text-text-main">
                Term GPA: <span className="text-navy">{t.termGpa !== null ? t.termGpa.toFixed(2) : "—"}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                      Course
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                      Credit Hours
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                      Grade
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-line px-3 py-2">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.courses.map((c) => (
                    <tr key={c.code} className="hover:bg-bg-page">
                      <td className="px-3 py-2.5 border-b border-[#f1f3f6] font-semibold text-text-main">
                        {c.code} — {c.title}
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#f1f3f6] text-text-muted">{c.creditHours}</td>
                      <td className="px-3 py-2.5 border-b border-[#f1f3f6] font-bold text-navy">{c.finalLetter}</td>
                      <td className="px-3 py-2.5 border-b border-[#f1f3f6] text-text-muted">{c.finalPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
