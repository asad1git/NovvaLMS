import { useEffect, useState } from "react";
import { IconCalendarStats, IconLock, IconUsersGroup } from "@tabler/icons-react";
import { getRegistrationOfferings, registerForOffering, dropOffering } from "../api/registration";
import { listCourses } from "../api/courses";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

export default function Register() {
  const [data, setData] = useState(null);
  const [myOfferings, setMyOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actingId, setActingId] = useState(null);

  async function refresh() {
    const [d, mine] = await Promise.all([getRegistrationOfferings(), listCourses()]);
    setData(d);
    setMyOfferings(mine);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load registration");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleRegister(offeringId) {
    setActingId(offeringId);
    setError("");
    setNotice("");
    try {
      await registerForOffering(offeringId);
      setNotice("Registered successfully.");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setActingId(null);
    }
  }

  async function handleDrop(offeringId) {
    setActingId(offeringId);
    setError("");
    setNotice("");
    try {
      await dropOffering(offeringId);
      setNotice("Dropped.");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Drop failed");
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <LoadingState label="Loading registration…" />;
  if (error && !data) return <p className="text-xs text-badge-red-text">{error}</p>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-badge-green-bg text-badge-green-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {notice}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-bold text-navy flex items-center gap-1.5">
            <IconCalendarStats size={15} /> {data.term.name}
          </h2>
          <Badge variant={data.registrationOpen ? "green" : "red"}>
            {data.registrationOpen ? "Registration Open" : "Registration Closed"}
          </Badge>
        </div>
        <p className="text-[11px] text-text-muted">
          {data.registrationOpen
            ? "You can register for any offering below with open seats and met prerequisites."
            : "Registration is not currently open for this term — check back later or contact an admin."}
        </p>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Currently Enrolled</h2>
        <div className="space-y-1">
          {myOfferings.length === 0 && (
            <EmptyState icon={<IconUsersGroup size={32} className="text-text-muted" />} title="Not enrolled in anything yet." />
          )}
          {myOfferings.map((o) => (
            <div
              key={o._id}
              className="flex items-center justify-between text-xs border-b border-line py-2 transition-colors duration-150 hover:bg-bg-page -mx-2 px-2 rounded"
            >
              <div>
                <div className="text-text-main font-medium">
                  {o.code} — {o.title}
                </div>
                <div className="text-[11px] text-text-muted">Teacher: {o.teacher?.name || "—"}</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDrop(o._id)}
                disabled={actingId === o._id}
              >
                {actingId === o._id ? "Dropping…" : "Drop"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-3">Available Offerings</h2>
        <div className="space-y-2">
          {data.offerings.length === 0 && (
            <EmptyState icon={<IconUsersGroup size={32} className="text-text-muted" />} title="Nothing available to register for." />
          )}
          {data.offerings.map((o) => {
            const full = o.seatsRemaining <= 0;
            const blocked = o.unmetPrerequisites.length > 0;
            const disabled = !data.registrationOpen || full || blocked || actingId === o._id;
            return (
              <div key={o._id} className="border border-line rounded-card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-text-main">
                      {o.code} — {o.title} <span className="text-text-muted">(Sec. {o.sectionLabel})</span>
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Teacher: {o.teacher?.name || "—"} · {o.creditHours} credit hours ·{" "}
                      {o.seatsRemaining}/{o.capacity} seats left
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleRegister(o._id)} disabled={disabled}>
                    {actingId === o._id ? "Registering…" : full ? "Full" : "Register"}
                  </Button>
                </div>
                {blocked && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-badge-red-text">
                    <IconLock size={13} className="flex-shrink-0 mt-px" />
                    Missing prerequisite(s): {o.unmetPrerequisites.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
