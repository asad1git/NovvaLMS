import { useEffect, useState } from "react";
import { IconBooks, IconCertificate, IconCalendarStats, IconTrash, IconPlus } from "@tabler/icons-react";
import {
  listCourses,
  createCourse,
  listCatalogCourses,
  listTerms,
  createTerm,
  createOffering,
  listTeachers,
  bulkEnrollCSV,
  getEnrollments,
} from "../api/courses";
import { listDepartments } from "../api/departments";
import { Card, Button, Badge, EmptyState, LoadingState } from "../components/ui";

const inputClass =
  "border border-line rounded px-3 py-2 text-xs transition-colors duration-150 " +
  "focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeSlot(slot) {
  return `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}${slot.room ? ` · ${slot.room}` : ""}`;
}

export default function AdminCourses() {
  const [offerings, setOfferings] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [termForm, setTermForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    registrationOpensAt: "",
    registrationClosesAt: "",
  });
  const [creatingTerm, setCreatingTerm] = useState(false);

  const [catalogForm, setCatalogForm] = useState({
    title: "",
    code: "",
    description: "",
    creditHours: 3,
    prerequisites: [],
    departmentId: "",
  });
  const [creatingCatalog, setCreatingCatalog] = useState(false);

  const [offeringForm, setOfferingForm] = useState({
    courseId: "",
    termId: "",
    teacherId: "",
    sectionLabel: "A",
    capacity: 30,
    schedule: [],
  });
  const [creatingOffering, setCreatingOffering] = useState(false);

  const [selectedOffering, setSelectedOffering] = useState(null);
  const [roster, setRoster] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  async function refreshAll() {
    const [o, c, t, teach, dept] = await Promise.all([
      listCourses(),
      listCatalogCourses(),
      listTerms(),
      listTeachers(),
      listDepartments(),
    ]);
    setOfferings(o);
    setCatalog(c);
    setTerms(t);
    setTeachers(teach);
    setDepartments(dept);
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshAll();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateTerm(e) {
    e.preventDefault();
    setCreatingTerm(true);
    setError("");
    try {
      await createTerm(termForm);
      setTermForm({ name: "", startDate: "", endDate: "", registrationOpensAt: "", registrationClosesAt: "" });
      setTerms(await listTerms());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create term");
    } finally {
      setCreatingTerm(false);
    }
  }

  async function handleCreateCatalog(e) {
    e.preventDefault();
    setCreatingCatalog(true);
    setError("");
    try {
      await createCourse(catalogForm);
      setCatalogForm({ title: "", code: "", description: "", creditHours: 3, prerequisites: [], departmentId: "" });
      setCatalog(await listCatalogCourses());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create catalog course");
    } finally {
      setCreatingCatalog(false);
    }
  }

  async function handleCreateOffering(e) {
    e.preventDefault();
    setCreatingOffering(true);
    setError("");
    try {
      await createOffering(offeringForm);
      setOfferingForm({ courseId: "", termId: "", teacherId: "", sectionLabel: "A", capacity: 30, schedule: [] });
      setOfferings(await listCourses());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create offering");
    } finally {
      setCreatingOffering(false);
    }
  }

  function addScheduleSlot() {
    setOfferingForm({
      ...offeringForm,
      schedule: [...offeringForm.schedule, { dayOfWeek: 1, startTime: "09:00", endTime: "10:00", room: "" }],
    });
  }

  function updateScheduleSlot(index, field, value) {
    const schedule = offeringForm.schedule.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setOfferingForm({ ...offeringForm, schedule });
  }

  function removeScheduleSlot(index) {
    setOfferingForm({ ...offeringForm, schedule: offeringForm.schedule.filter((_, i) => i !== index) });
  }

  async function openOffering(offering) {
    setSelectedOffering(offering);
    setEnrollResult(null);
    setError("");
    setRoster([]); // clear immediately so switching offerings never shows the previous roster
    setRoster(await getEnrollments(offering._id));
  }

  async function handleEnroll(e) {
    e.preventDefault();
    if (!csvFile || !selectedOffering) return;
    setEnrolling(true);
    setError("");
    try {
      const result = await bulkEnrollCSV(selectedOffering._id, csvFile);
      setEnrollResult(result);
      setRoster(await getEnrollments(selectedOffering._id));
      setCsvFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) return <LoadingState label="Loading courses…" />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-badge-red-bg text-badge-red-text text-xs rounded-card px-4 py-2 animate-[fadeIn_0.15s_ease-in]">
          {error}
        </div>
      )}

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-1">Academic Terms</h2>
        <p className="text-[11px] text-text-muted mb-3">
          The academic calendar every course offering belongs to (e.g. "Fall 2026").
        </p>
        <form onSubmit={handleCreateTerm} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Term Name</label>
            <input
              className={inputClass}
              placeholder="e.g. Fall 2026"
              value={termForm.name}
              onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={termForm.startDate}
              onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">End Date</label>
            <input
              type="date"
              className={inputClass}
              value={termForm.endDate}
              onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Registration Opens (optional)</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={termForm.registrationOpensAt}
              onChange={(e) => setTermForm({ ...termForm, registrationOpensAt: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Registration Closes (optional)</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={termForm.registrationClosesAt}
              onChange={(e) => setTermForm({ ...termForm, registrationClosesAt: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={creatingTerm} className="sm:col-span-3 w-fit">
            {creatingTerm ? "Creating…" : "Create Term"}
          </Button>
        </form>
        <p className="text-[11px] text-text-muted mb-3">
          Leave the registration window blank if students shouldn't self-register into this term
          yet — a missing window is always treated as closed, never as "always open."
        </p>
        <div className="flex flex-wrap gap-1.5">
          {terms.length === 0 && <p className="text-[11px] text-text-muted">No terms created yet.</p>}
          {terms.map((t) => (
            <Badge key={t._id} variant={t.isActive ? "blue" : "gray"}>
              {t.name}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-1">Course Catalog</h2>
        <p className="text-[11px] text-text-muted mb-3">
          A catalog course exists once, independent of who teaches it or when — assign it to a
          teacher and term below under Course Offerings.
        </p>
        <form onSubmit={handleCreateCatalog} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Course Title</label>
            <input
              className={inputClass}
              placeholder="Course title"
              value={catalogForm.title}
              onChange={(e) => setCatalogForm({ ...catalogForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Course Code</label>
            <input
              className={inputClass}
              placeholder="e.g. CS201"
              value={catalogForm.code}
              onChange={(e) => setCatalogForm({ ...catalogForm, code: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Description (optional)</label>
            <input
              className={inputClass}
              placeholder="Description"
              value={catalogForm.description}
              onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Credit Hours</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={catalogForm.creditHours}
              onChange={(e) => setCatalogForm({ ...catalogForm, creditHours: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Department (optional)</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={catalogForm.departmentId}
              onChange={(e) => setCatalogForm({ ...catalogForm, departmentId: e.target.value })}
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-text-muted mb-1">
              Prerequisites (optional — Ctrl/Cmd-click to select multiple)
            </label>
            <select
              multiple
              className={`w-full bg-white ${inputClass} h-[72px]`}
              value={catalogForm.prerequisites}
              onChange={(e) =>
                setCatalogForm({
                  ...catalogForm,
                  prerequisites: Array.from(e.target.selectedOptions, (o) => o.value),
                })
              }
            >
              {catalog.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={creatingCatalog} className="sm:col-span-3 w-fit">
            {creatingCatalog ? "Creating…" : "Add to Catalog"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {catalog.length === 0 && <p className="text-[11px] text-text-muted">No catalog courses yet.</p>}
          {catalog.map((c) => (
            <Badge key={c._id} variant="gray">
              {c.code} — {c.title}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-[13px] font-bold text-navy mb-1">Course Offerings</h2>
        <p className="text-[11px] text-text-muted mb-3">
          Assigns a catalog course to a teacher for a specific term — this is what students
          actually enroll into.
        </p>
        <form onSubmit={handleCreateOffering} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Catalog Course</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={offeringForm.courseId}
              onChange={(e) => setOfferingForm({ ...offeringForm, courseId: e.target.value })}
              required
            >
              <option value="">Select course…</option>
              {catalog.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Term</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={offeringForm.termId}
              onChange={(e) => setOfferingForm({ ...offeringForm, termId: e.target.value })}
              required
            >
              <option value="">Select term…</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Teacher</label>
            <select
              className={`w-full bg-white ${inputClass}`}
              value={offeringForm.teacherId}
              onChange={(e) => setOfferingForm({ ...offeringForm, teacherId: e.target.value })}
              required
            >
              <option value="">Assign teacher…</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Section</label>
            <input
              className={inputClass}
              placeholder="A"
              value={offeringForm.sectionLabel}
              onChange={(e) => setOfferingForm({ ...offeringForm, sectionLabel: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Capacity</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={offeringForm.capacity}
              onChange={(e) => setOfferingForm({ ...offeringForm, capacity: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] text-text-muted">
                Weekly Schedule (optional — enables conflict detection for teacher double-booking
                and student overlapping sections)
              </label>
              <button
                type="button"
                onClick={addScheduleSlot}
                className="text-[11px] text-navy-light hover:underline flex items-center gap-1"
              >
                <IconPlus size={12} /> Add meeting time
              </button>
            </div>
            {offeringForm.schedule.length > 0 && (
              <div className="space-y-2 mb-2">
                {offeringForm.schedule.map((slot, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <select
                      className={`w-full bg-white ${inputClass}`}
                      value={slot.dayOfWeek}
                      onChange={(e) => updateScheduleSlot(i, "dayOfWeek", Number(e.target.value))}
                    >
                      {DAY_NAMES.map((d, idx) => (
                        <option key={idx} value={idx}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      className={inputClass}
                      value={slot.startTime}
                      onChange={(e) => updateScheduleSlot(i, "startTime", e.target.value)}
                    />
                    <input
                      type="time"
                      className={inputClass}
                      value={slot.endTime}
                      onChange={(e) => updateScheduleSlot(i, "endTime", e.target.value)}
                    />
                    <input
                      className={inputClass}
                      placeholder="Room (optional)"
                      value={slot.room}
                      onChange={(e) => updateScheduleSlot(i, "room", e.target.value)}
                    />
                    <button type="button" onClick={() => removeScheduleSlot(i)} className="text-badge-red-text">
                      <IconTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" disabled={creatingOffering} className="sm:col-span-4 w-fit">
            {creatingOffering ? "Creating…" : "Create Offering"}
          </Button>
        </form>

        <h3 className="text-[13px] font-semibold text-text-main mb-2">All Offerings</h3>
        <div className="space-y-2">
          {offerings.length === 0 && (
            <EmptyState icon={<IconBooks size={32} className="text-text-muted" />} title="No offerings yet." />
          )}
          {offerings.map((o) => (
            <div
              key={o._id}
              onClick={() => openOffering(o)}
              className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer border transition-colors duration-150 ${
                selectedOffering?._id === o._id
                  ? "border-navy-light bg-badge-blue-bg"
                  : "border-line hover:bg-bg-page"
              }`}
            >
              <div>
                <div className="text-xs font-medium text-text-main">
                  {o.code} — {o.title}
                  {o.sectionLabel && <span className="text-text-muted"> (Sec. {o.sectionLabel})</span>}
                </div>
                <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                  Teacher: {o.teacher?.name || "—"}
                  {o.term?.name && (
                    <span className="inline-flex items-center gap-0.5">
                      <IconCalendarStats size={12} /> {o.term.name}
                    </span>
                  )}
                  {o.capacity !== undefined && (
                    <span>
                      · {o.seatsRemaining}/{o.capacity} seats left
                    </span>
                  )}
                </div>
                {o.schedule?.length > 0 && (
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {o.schedule.map(describeSlot).join(" · ")}
                  </div>
                )}
              </div>
              <Badge variant={o.isActive ? "green" : "red"}>{o.isActive ? "Active" : "Inactive"}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {selectedOffering && (
        <Card>
          <h2 className="text-[13px] font-bold text-navy mb-3">
            Bulk Enroll — {selectedOffering.code} (Sec. {selectedOffering.sectionLabel})
          </h2>
          <form onSubmit={handleEnroll} className="flex items-center gap-2 mb-2">
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="text-xs" />
            <Button type="submit" disabled={enrolling || !csvFile} variant="secondary" size="sm">
              {enrolling ? "Uploading…" : "Upload CSV"}
            </Button>
          </form>
          <p className="text-[11px] text-text-muted mb-3">
            CSV must have an "email" column of existing student accounts.
          </p>

          {enrollResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-[11px] animate-[fadeIn_0.15s_ease-in]">
              <div className="bg-badge-green-bg text-badge-green-text rounded px-2 py-1">
                Enrolled: {enrollResult.enrolled.length}
              </div>
              <div className="bg-badge-amber-bg text-badge-amber-text rounded px-2 py-1">
                Already enrolled: {enrollResult.skipped.length}
              </div>
              <div className="bg-badge-red-bg text-badge-red-text rounded px-2 py-1">
                Not found: {enrollResult.notFound.length}
              </div>
            </div>
          )}

          <h3 className="text-[13px] font-semibold text-text-main mb-2">Roster ({roster.length})</h3>
          <div className="space-y-1">
            {roster.map((e) => (
              <div key={e._id} className="text-xs text-text-muted flex justify-between border-b border-line py-1">
                <span>{e.student?.name}</span>
                <span className="text-text-muted">{e.student?.email}</span>
              </div>
            ))}
            {roster.length === 0 && <EmptyState icon={<IconCertificate size={32} className="text-text-muted" />} title="No students enrolled yet." />}
          </div>
        </Card>
      )}
    </div>
  );
}
