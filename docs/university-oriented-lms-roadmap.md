# Making Novva LMS Completely University-Oriented — Discussion Notes

**Status: discussion only, nothing here has been decided or started.** This file records a
planning conversation about two possible future directions for the project — going deeper on
real university academic structure, and/or turning the product into multi-tenant SaaS. No
implementation work has begun on anything below; this is a reference document to pick back up
from when a direction is chosen.

---

## The original framing

The conversation started from two questions asked together:
1. How do we make this LMS completely university-oriented (i.e., model real academic structure,
   not just the FYP-scoped feature set)?
2. How do we turn it into a SaaS product (multi-tenant, billing, onboarding)?

These two pull in somewhat opposite directions, which is worth keeping in mind even though this
document focuses on direction (1): **the more deeply you model one university's specific
academic structure, the harder that structure is to genericize for arbitrary paying customers,
and vice versa.** Full SaaS multi-tenancy would mean, structurally: a tenant/institution field on
every collection with query-scoping enforced everywhere, subdomain/tenant resolution, billing,
and — since file storage is still local disk (`backend/uploads/`) rather than S3 — moving off
local disk becomes a hard requirement rather than an optional cleanup. That direction was
explicitly set aside for this document in favor of digging into "university-oriented" first.

Also worth remembering: there's an existing project memory recording an earlier decision —
*"institution-agnostic/configurable single-tenant, not full multi-tenant SaaS"* — so pursuing
full SaaS multi-tenancy later would be revisiting that call, not just extending it.

---

## Part 1 — What "completely university-oriented" would actually require

Today's schema is FYP-scoped, not university-scoped: `Course` is one flat object with a single
teacher and no term concept, there's no department/program/degree hierarchy, no GPA/transcript/
credit-hours, no prerequisites, no scheduling/room-conflict logic, and roles are flat
(`admin`/`teacher`/`student`/`parent`, no registrar/HOD/advisor). The pieces below are laid out
roughly in build order — most later items structurally depend on the first two existing.

### 1. The foundational split: catalog course vs. offering

This is the one everything else hangs off. Right now `Course` is a single flat object — code,
title, one teacher, with materials/quizzes/assignments/attendance all attached directly to it. A
real university needs two layers:
- **Course** (catalog): "CS201 — Data Structures," credit hours, department, description,
  prerequisites — exists once, forever, independent of who's teaching it or when.
- **CourseOffering / Section**: "CS201, Section A, Fall 2026, taught by Dr. Khan" — this is what
  `Course` currently *is*. Materials, quizzes, assignments, attendance, the chatbot's RAG context
  — everything currently scoped to `Course` would actually re-scope to `CourseOffering`.

Without this split, the same course taught by two teachers in the same term, or the same course
taught in two different terms, is a data-modeling contradiction. `Enrollment` currently points at
`Course` — it should point at `CourseOffering`.

### 2. A real academic calendar (Term)

Nothing currently knows what "this semester" means — a quiz, an assignment, a fee challan all
just exist in an undated void. A `Term` model (Fall 2026, start/end dates, registration window,
add/drop deadline) becomes the anchor almost everything else needs: offerings belong to a term,
enrollment happens within a term's registration window, GPA is computed per-term and
cumulatively, fee challans are per-term.

### 3. Registration, not admin-only CSV enrollment

Today, enrollment is 100% admin-driven (bulk CSV, matched against existing student accounts by
email — see `courseController.bulkEnrollFromCSV`). A university-oriented version needs student
self-registration within the term's window — browse offerings, check seat capacity, get blocked
by unmet prerequisites, maybe a waitlist when a section is full. This is a real workflow change,
not just a schema addition — it shifts "who can create an Enrollment" from admin-only to
student-initiated-but-validated.

### 4. Grades that mean something: GPA, transcripts, credit hours

Quiz/assignment scores currently live and die inside their own quiz/assignment — there's no
notion of "this quiz averaged with that assignment becomes a final course grade." Needed:
`Course.creditHours`, a grade scale (A/B/C → grade points), a per-offering final-grade
computation (probably teacher-finalized, HITL-style — same philosophy as the existing AI-grading
pattern), and a `Transcript`/`AcademicRecord` that rolls per-term and cumulative GPA. This is the
payoff layer — it's what makes "Analytics" and "My Results" feel like a real academic record
instead of a quiz-score dashboard.

### 5. Roles narrower than "admin"

Admin is currently a monolith. A university wants: **Registrar** (owns terms, offerings,
registration rules), **Department Head** (approves things within one department, sees
department-level reporting), **Advisor** (sees/approves a specific set of students' registration
and degree progress — structurally similar to the existing `ParentLink` shape, actually). None of
these need full admin power; RBAC needs a scoping dimension (which department/which advisees),
not just a role name.

### 6. Scheduling and timetable

Attendance sessions today are ad hoc — a teacher clicks "New Session" whenever. A real timetable
means each `CourseOffering` has a fixed weekly schedule (day, time, room), enabling real conflict
detection (a student can't register into two overlapping sections; a teacher can't be
double-booked), and would let attendance sessions be *generated* from the schedule rather than
manually created each time.

### 7. Fee structure with actual logic

`FeeChallan` today is a flat amount an admin types in. University-grade fee handling means a fee
structure (tuition per credit hour + fixed fees) that auto-generates a challan from a student's
registered credit-hour load each term, installment plans, and a financial hold that can block
registration or transcript release.

### 8. Degree audit / academic standing

The furthest-out piece: does this student's completed courses satisfy their program's
requirements to graduate? Probation/suspension thresholds based on GPA. Depends on everything
above already existing, so it's naturally last.

**Sequencing note:** items 1 and 2 (catalog/offering split + Term) are true prerequisites for
almost everything else — 3 through 8 all assume those exist. 5 (roles) and 6 (scheduling) can
happen in either order and don't block each other. 7 and 8 are the most "extra" — the system
functions as a university tool without them, just a less complete one.

---

## Part 2 — Is all of this actually implementable? (risk assessment)

Nothing on the list above is technically *impossible* — all of it is buildable on the current
stack (Node/Express/Mongo/React), no new infrastructure needed. But implementability varies a
lot, and there are specific, concrete risks worth naming rather than glossing over.

| # | Item | Risk level | The actual risk |
|---|---|---|---|
| 1 | Catalog/Offering split | **Highest** | Not conceptually hard, but almost every collection (`Material`, `Quiz`, `Assignment`, `AttendanceSession`, `ChatSession`) points directly at `Course`, and the shared authorization gate (`assertCourseAccess`/`assertCourseManager`, used everywhere) is built around "one course = one teacher." This is a breaking migration through the most security-sensitive part of the app — get it wrong and it's an RBAC regression, not just a bug. |
| 2 | Term / academic calendar | Medium | Mostly additive, but the same class of subtlety as the existing quiz-deadline logic: date/timezone edge cases (what happens to an in-progress quiz attempt when a term "ends," registration-window boundaries). |
| 3 | Self-service registration (capacity, waitlist, prerequisites) | Medium-high, with a **real technical blocker** | Seat-capacity enforcement under concurrent requests is a race condition, and this project's MongoDB is explicitly standalone with **no multi-document transaction support** — already documented in CLAUDE.md (`submitAttempt`'s "check, then write, manually roll back on failure" pattern exists specifically *because* transactions aren't available). Two students hitting "register" on the last seat at the same instant is exactly the scenario that pattern doesn't safely handle. Solvable (a DB-level unique constraint + retry, or a replica set that supports transactions), but a real design decision, not free. |
| 4 | GPA / transcript / grades | Medium | The math (weighted average → letter grade → grade points → GPA) is standard. The risk is policy edge cases — repeated courses, withdrawals, incompletes, rounding rules — not architecture. |
| 5 | Narrower roles (Registrar/HOD/Advisor) | **Lowest** | `authorize()` is already role-array-based and was explicitly built to be role-agnostic when `parent` was added later. The scoping part (HOD sees only their department, Advisor sees only their advisees) reuses a pattern that already exists and works — it's basically `ParentLink` again for a different relationship. |
| 6 | Scheduling / conflict detection | Medium, split in two | *Checking* a manually-built schedule for conflicts (student or teacher double-booked) is easy and bounded at this scale. *Auto-generating* an optimal timetable from scratch is a genuinely hard constraint-satisfaction problem real SIS vendors have whole teams for — worth ruling out of scope and assuming schedules are entered manually. |
| 7 | Fee automation | Low-medium | Same shape as the already-working FeeChallan/SalarySlip PDF generation, just with computed amounts instead of typed ones. |
| 8 | Degree audit | Simplified version tractable; full generality is **genuinely open-ended** | A program requiring a fixed list of courses is very buildable. Elective categories, transfer credit, minimum grades per major course, etc. is the kind of feature real SIS products spend years on — full generality isn't realistically worth chasing here. |

### Systemic risks, separate from any one item

- **Migration, not greenfield** — there's already accumulated data in the dev DB. Splitting
  Course/Offering isn't "add a model," it's "write a migration that doesn't corrupt what exists."
- **RBAC surface area grows a lot** — every new role/scope is a new way to accidentally leak data
  across a boundary. Would need the same rigor already applied elsewhere in the project (the
  Playwright RBAC-boundary tests used throughout this project's history) expanded accordingly.
- **Scope** — realistically this is several times the code surface of what exists today. Not a
  sprint-sized addition, closer to a second phase of the project.

**Bottom line from the discussion:** nothing here says "can't be done." It says pick the order
carefully — items 1 and 3 specifically need real design discussion before any code — and be
honest that full generality on items 6 and 8 isn't worth chasing.

---

## Where this was left

Purely a discussion — no decision was made on whether or when to pursue this, and no code has
been written toward any of it. The user's own words: *"we are just discussing, i decide to, i
will tell you later."*
