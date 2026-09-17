import { useEffect, useState } from "react";
import { IconUsers, IconFileCertificate, IconBooks } from "@tabler/icons-react";
import DashboardShell from "../components/DashboardShell";
import AccountSettings from "./AccountSettings";
import { getMyAdvisees, getAdviseeTranscript, getAdviseeRegistration, getAdviseeDegreeAudit } from "../api/advisorLinks";
import DegreeAuditView from "../components/DegreeAuditView";
import { Card, EmptyState, LoadingState } from "../components/ui";

const NAV_ITEMS = ["My Advisees", "Account Settings"];

function AdviseePicker({ advisees, selectedId, setSelectedId }) {
  if (advisees.length <= 1) return null;
  return (
    <div className="flex gap-2 mb-4">
      {advisees.map((a) => (
        <button
          key={a._id}
          onClick={() => setSelectedId(a._id)}
          className={`text-xs font-medium px-4 py-2 rounded-card border transition-all duration-150 ${
            a._id === selectedId
              ? "bg-navy text-white border-navy shadow-card"
              : "bg-white text-text-main border-line hover:border-navy-light hover:shadow-card"
          }`}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}

function AdviseeDetail({ advisee }) {
  const [transcript, setTranscript] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [degreeAudit, setDegreeAudit] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      getAdviseeTranscript(advisee._id),
      getAdviseeRegistration(advisee._id),
      getAdviseeDegreeAudit(advisee._id),
    ])
      .then(([t, r, d]) => {
        setTranscript(t);
        setRegistration(r);
        setDegreeAudit(d);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load advisee data"))
      .finally(() => setLoading(false));
  }, [advisee._id]);

  if (loading) return <LoadingState label={`Loading ${advisee.name}'s record…`} />;
  if (error) return <Card variant="danger"><p className="text-xs text-badge-red-text">{error}</p></Card>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="p-4">
          <div className="text-[11px] text-text-muted">Cumulative GPA</div>
          <div className="text-2xl font-bold text-navy">{transcript.cumulativeGpa ?? "—"}</div>
        </Card>
        <Card padding="p-4">
          <div className="text-[11px] text-text-muted">Total Credit Hours</div>
          <div className="text-2xl font-bold text-navy">{transcript.cumulativeCredits}</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Current Registration ({registration.length})</h2>
        {registration.length === 0 ? (
          <EmptyState icon={<IconBooks size={32} className="text-text-muted" />} title="Not registered in any course this term." />
        ) : (
          <div className="space-y-1">
            {registration.map((o) => (
              <div key={o._id} className="flex items-center justify-between text-xs border-b border-line py-2">
                <div>
                  <div className="text-text-main font-medium">{o.courseCode} — {o.courseTitle}</div>
                  <div className="text-[11px] text-text-muted">{o.termName} · {o.teacherName}</div>
                </div>
                <span className="text-[11px] text-text-muted">{o.creditHours} credit hours</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Transcript</h2>
        {transcript.terms.length === 0 ? (
          <EmptyState icon={<IconFileCertificate size={32} className="text-text-muted" />} title="No finalized grades yet." />
        ) : (
          <div className="space-y-4">
            {transcript.terms.map((t) => (
              <div key={t.term._id}>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold text-text-main">{t.term.name}</h3>
                  <span className="text-[11px] text-text-muted">Term GPA: {t.termGpa ?? "—"}</span>
                </div>
                <div className="space-y-1">
                  {t.courses.map((c) => (
                    <div key={c.code} className="flex items-center justify-between text-xs border-b border-line py-1.5">
                      <span>{c.code} — {c.title}</span>
                      <span className="text-text-muted">{c.finalLetter} ({c.finalPercentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DegreeAuditView audit={degreeAudit} />
    </div>
  );
}

function MyAdvisees() {
  const [advisees, setAdvisees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAdvisees()
      .then((list) => {
        setAdvisees(list);
        if (list.length > 0) setSelectedId(list[0]._id);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (advisees.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconUsers size={32} className="text-text-muted" />}
          title="No students assigned to you yet"
          subtitle="Contact your institution's admin to get linked to your advisees."
        />
      </Card>
    );
  }

  const selected = advisees.find((a) => a._id === selectedId);

  return (
    <div>
      <AdviseePicker advisees={advisees} selectedId={selectedId} setSelectedId={setSelectedId} />
      {selected && <AdviseeDetail advisee={selected} />}
    </div>
  );
}

export default function AdvisorDashboard() {
  const [activeNav, setActiveNav] = useState("My Advisees");

  return (
    <DashboardShell role="Advisor" navItems={NAV_ITEMS} activeNav={activeNav} onNavClick={setActiveNav}>
      {activeNav === "Account Settings" ? <AccountSettings /> : <MyAdvisees />}
    </DashboardShell>
  );
}
