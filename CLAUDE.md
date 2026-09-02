# Novva LMS — Project Context for Claude Code

This file is auto-loaded by Claude Code at the start of every session.
It captures the full design context from our SDS (Phase 2 document) so
you never have to re-explain the project from scratch.

---

## What This Project Is

**Novva LMS** — an AI-Powered Learning Management System for University of
Central Punjab, FYP Group S26SE010. Supervisor/Product Owner: Prof. Khizer Hayat.

Unlike a passive LMS, Novva integrates AI directly into the academic cycle:
- Teachers generate quizzes automatically from uploaded lecture files
- AI drafts subjective grades but a **teacher must approve every grade** (HITL)
- Students get a chatbot that answers **only** from their course material (RAG)
- Students get analytics identifying their weak topics

**Target:** reduce instructor assessment workload by 60% while keeping teachers
in full control of final grades.

---

## Tech Stack

- **Backend:** Node.js + Express.js (MVC pattern)
- **Frontend:** React.js + Vite + Tailwind CSS
- **Database:** MongoDB (Mongoose ODM) — Atlas in production
- **File Storage:** AWS S3 / Cloudinary (target); local disk (`backend/uploads/`) for
  now — vendor decision deliberately deferred, see Current Status (lecture materials,
  max 20MB, PDF/PPTX/DOCX)
- **AI:** Google Gemini (primary, `AI_PROVIDER=gemini`) + OpenAI GPT-4o (swap-ready via
  `AI_PROVIDER=openai`), via RAG — see Current Status for `services/ai/`
- **Auth:** JWT (7-day expiry) + bcrypt (salt rounds: 10) + RBAC middleware

---

## Architecture — Layered N-Tier

```
Presentation (React+Tailwind) → Business Logic (Node+Express, MVC) → Data (MongoDB+S3)
                                         ↓
                          External AI Service Layer (OpenAI/Gemini)
```

Every protected request flows: **JWT verify (`protect`) → Role check (`authorize`) → Controller**.
Never let a controller run without both middlewares if the route needs auth.

---

## Roles & RBAC

Three roles only: `admin`, `teacher`, `student`. A student token must NEVER
be able to reach a teacher or admin route, even if otherwise valid. Enforce
this at the middleware level (`authorize("admin")`, etc.), not inside controllers.

---

## The Core AI Concepts — Do Not Violate These

### RAG (Retrieval-Augmented Generation)
Never call the LLM directly with a raw user question. Always:
1. Extract lecture text (`pdf-parse`)
2. Split into ~500-token overlapping chunks
3. Select the most relevant chunks for the query
4. Inject those chunks as context into the prompt
5. **Strict system prompt**: "Answer only from the provided context. If the
   answer is not in the context, reply: 'I do not have enough context from
   the uploaded material.'"

### HITL (Human-in-the-Loop) — non-negotiable
AI NEVER publishes a grade directly. Flow must always be:
`AI drafts score + justification → stored as pending → Teacher reviews →
Teacher approves/overrides → ONLY THEN is it the final grade.`
Do not build any "auto-publish AI grade" shortcut, even for testing.

### PII Stripping
Never include student names, emails, or registration numbers in text sent
to OpenAI/Gemini. Only academic content goes in the prompt.

---

## Database — 12 MongoDB Collections

`Users, Courses, Enrollments, Materials, Quizzes, Questions, QuizAttempts,
Answers, ChatSessions, Messages, FeeChallans, SalarySlips`

Key relationships:
- User (teacher) → many Courses
- Course → many Enrollments, Materials, Quizzes
- Material → many Quizzes (source)
- Quiz → many Questions, many QuizAttempts
- QuizAttempt → many Answers
- ChatSession → many Messages

Key indexes: `Users.email` (unique), `Enrollments(studentId+courseId)` (compound
unique), `QuizAttempts(quizId+studentId)` (unique — one attempt per student per quiz).

**User schema fields:** `name, email (unique, lowercase), passwordHash (select:false),
role (enum), isActive (default true), createdAt`. This already exists in
`backend/models/User.js` — follow the same pattern (methods on schema, hide
passwordHash via `toJSON` transform) for every new model.

---

## Product Backlog — 11 User Stories (47 points total)

| ID | Story | Epic | Points | Sprint |
|---|---|---|---|---|
| US-01 | Admin creates accounts, bcrypt + credential email | EP01 | 2 | 2 ✅ |
| US-02 | JWT login, role-based redirect | EP01 | 2 | 2 ✅ |
| US-03 | Admin creates courses, CSV bulk enrollment | EP02 | 3 | 3 ✅ |
| US-04 | Teacher uploads lecture files (PDF/PPTX, 20MB max) | EP03 | 3 | 3 ✅ |
| US-05 | Teacher generates AI quiz via RAG | EP04 | 8 | 4-5 ✅ |
| US-06 | Teacher reviews/approves AI grades (HITL) | EP05 | 5 | 6 (workflow done ahead of schedule; AI drafting still pending) |
| US-07 | Student uses context-aware AI chatbot | EP06 | 8 | 7 |
| US-08 | Student attempts timed quiz, 30s auto-save | EP06 | 5 | 7 ✅ |
| US-09 | Admin generates fee challan PDF | EP07 | 3 | 8 |
| US-10 | Admin generates salary slip PDF | EP07 | 3 | 8 |
| US-11 | Student views performance analytics | EP08 | 5 | 9 |

**✅ = already built and tested.** Everything else is not started yet.

---

## Current Status (Sprint 1-3 + Quiz Core / HITL Grading / AI Quiz Gen Code-Complete)

**Verified end-to-end against a real local MongoDB (not mocked) and a real
browser (Playwright click-through, zero console errors), covering every
role (admin/teacher/student) and RBAC boundary (cross-teacher, non-enrolled
student, no-token, cross-student attempt tampering):**
- `backend/models/User.js`, `Course.js`, `Enrollment.js`, `Material.js`,
  `Quiz.js`, `Question.js` (now has `type: "mcq"|"subjective"` + `maxScore`),
  `QuizAttempt.js` (now has `maxScore` + `gradingComplete`), `Answer.js`
  (now has `textAnswer`, `gradeStatus`, `score`, `feedback`, `gradedBy`, `gradedAt`)
- `authController.js` (`login`, `getMe`, `createUser`), `courseController.js`
  (`createCourse`, `getCourses`, `getCourseById`, `bulkEnrollFromCSV`, `getEnrollments`),
  `materialController.js` (`uploadMaterial`, `getMaterials`, `downloadMaterial`, `deleteMaterial`),
  `quizController.js` (`createQuiz`, `getQuizzesForCourse`, `getQuizById`, `publishQuiz`,
  `startOrResumeAttempt`, `getAttemptsForQuiz`), `attemptController.js`
  (`autosaveAnswer`, `submitAttempt`), `gradingController.js` (`getPendingGrades`, `gradeAnswer`)
- `backend/utils/courseAccess.js` — shared `assertCourseAccess` / `assertCourseManager`
  RBAC helpers, reused by courses, materials, quizzes, AND grading
- `backend/utils/scoring.js` — `recomputeAttemptScore`, shared by `submitAttempt` and
  `gradeAnswer` so an attempt's score/maxScore/gradingComplete is always derived the same way
- `backend/middleware/authMiddleware.js` (`protect`), `rbacMiddleware.js` (`authorize`),
  `uploadMiddleware.js` (multer: disk storage for materials, memory storage for CSV)
- `backend/middleware/errorMiddleware.js` (now also maps Multer errors to 400),
  `backend/config/db.js` (graceful DB-down handling)
- `backend/scripts/seedAdmin.js` — bootstraps the first admin
- `frontend/src/pages/Login.jsx`, `AdminDashboard.jsx` + `AdminCourses.jsx` + `AdminUsers.jsx`,
  `TeacherDashboard.jsx` + `TeacherCourses.jsx` (materials + quiz creation with a per-question
  MCQ/subjective type picker + publish/results) + `GradeApprovals.jsx` (the "Grade Approvals"
  nav item that sat unused since Sprint 1 — now lists every pending subjective answer across
  the teacher's courses with an inline score+feedback form),
  `StudentDashboard.jsx` + `StudentCourses.jsx` (materials + quiz list), `QuizAttempt.jsx`
  (dedicated timed quiz-taking screen: countdown, resume support, 30s autosave, auto-submit at
  zero, renders a textarea for subjective questions, shows "awaiting teacher review" when the
  score is still provisional)
- `frontend/src/context/AuthContext.jsx`, `components/ProtectedRoute.jsx`,
  `components/DashboardShell.jsx` (nav is now interactively wired to each dashboard's sections)
- `frontend/src/api/axios.js`, `api/courses.js` (blob-based authenticated file download,
  since JWT is header-based — a plain `<a href>` can't carry it), `api/users.js`, `api/quizzes.js`

**Question.correctOptionIndex is `select: false`** — mirrors `User.passwordHash`'s pattern
exactly, so a student attempting a quiz can never read the answer key out of the API
response. Only explicitly `.select("+correctOptionIndex")` for the owning teacher/admin, or
server-side when grading. **The quiz time limit is enforced server-side** (in
`attemptController.autosaveAnswer`), not just by the frontend countdown — a determined
student can't bypass it via devtools.

**Quiz generation is manual for now** (a teacher builds the quiz directly in
`TeacherCourses.jsx`, choosing MCQ or subjective per question) — this is intentional, per the
AI-vendor-sequencing decision: build the full traditional workflow first, plug in AI generation
(US-05) behind the same `Quiz`/`Question` schema later, once an AI vendor is chosen.

**HITL grading is a manual approve-only step for now** — a subjective answer goes straight to
`gradeStatus: "pending"` at submission (nothing drafts a score yet), and a Teacher's entry in
Grade Approvals IS the final grade, not a review of an AI draft. This is deliberate: it builds
the exact `pending → graded` state machine and `recomputeAttemptScore` seam that Sprint 6's AI
grading needs, without inventing a fake "approve your own draft" step that has no AI yet to be
meaningful. When AI grading arrives, it populates `score`/`feedback` at submission time instead
of leaving them null — Grade Approvals then becomes a real approve/override screen, unchanged
in shape.

**File storage is local disk for now** (`backend/uploads/materials/`, served only via
an authenticated `GET /api/materials/:id/download` route — deliberately not a static
mount, since that would bypass `protect` and leak lecture material to anyone with the
URL). `Material.fileUrl` stores just the local filename today; the field is named to
survive a later swap to a real S3/Cloudinary URL without a migration.

**AI vendor decided: Gemini primary, OpenAI swap-ready.** `backend/services/ai/` is the
External AI Service Layer from CLAUDE.md's own architecture diagram — `index.js` picks
`geminiProvider.js` or `openaiProvider.js` based on the `AI_PROVIDER` env var (default
`gemini`), both implementing the identical `generateQuiz({text, numQuestions})` contract
via native `fetch` (no new HTTP-client dependency) with JSON-schema-enforced structured
output (Sprint 5's "JSON enforcement" goal). Switching providers is an env var + restart,
never a code change. `backend/services/ragEngine.js` extracts PDF text (`pdf-parse` v2 —
its API is class-based, `new PDFParse({data: buffer}).getText()`, not the v1 function
export most docs/examples show) and chunks it (US-07's chatbot will consume the chunking;
quiz generation currently feeds the AI the full extracted text, capped at 30,000 chars,
since a lecture-PDF-sized document fits a modern context window without needing
relevance-based chunk selection).

**US-05 is fully verified end-to-end, including a real live Gemini call.** RBAC,
validation, PDF extraction, the "not configured" graceful-failure path, AND a real
`GEMINI_API_KEY` generating actual questions from a real PDF were all tested (curl +
Playwright). The generated MCQs were accurate and correctly answer-keyed against the
source material. `POST /api/courses/:id/quizzes/generate` drafts questions into the same
shape `createQuiz` already expects and returns them WITHOUT saving — the teacher
reviews/edits in the same question-builder UI as manual creation (a "Generate with AI"
panel next to it) before anything is persisted, keeping the teacher in control the same
way HITL keeps them in control of grades.

**Gemini's free tier takes ~20-26 seconds per generation call in practice** — not a bug,
just a real latency characteristic worth knowing before assuming something hung. The
default model is `gemini-3.6-flash` (`gemini-2.0-flash`, an earlier guess, was already
retired by the time this was live-tested — Gemini's own error response named the
replacement). If a future model retirement breaks this again, it's a `GEMINI_MODEL` env
var change, not a code change.

**Not started:** AI grade *drafting* specifically (the HITL review/approve workflow from
US-06 is done — when this is picked up, add a `gradeSubjective(answer, rubric)` function
to each `services/ai/` provider alongside `generateQuiz`, following the same pattern),
chatbot (US-07 — will reuse `services/ai/` and `ragEngine.js`'s chunking, which quiz
generation doesn't need but chat's query-driven relevance selection does), analytics,
PDF generation.

**Pre-existing, unrelated npm audit finding:** `qs` (transitive via `express`→`body-parser`)
has a moderate DoS advisory with no patched version published yet as of this writing —
confirmed present before any work in this session touched dependencies; `npm audit fix`
has nothing to apply. Not introduced by `pdf-parse`.

---

## Design System (already in `frontend/tailwind.config.js` — reuse, don't reinvent)

| Token | Value |
|---|---|
| Primary (navy) | `#1F3864` |
| Secondary (blue) | `#2E75B6` |
| Page background | `#F4F6F9` |
| Student badge | bg `#FAEEDA` / text `#633806` |
| Teacher badge | bg `#E6F1FB` / text `#0C447C` |
| Success badge | bg `#EAF3DE` / text `#27500A` |
| Danger/weak | bg `#FCEBEB` / text `#791F1F` |
| Font | Arial / Inter |
| Border radius | 8px cards, 4px inputs/buttons |
| Sidebar width | 200px, dark navy, matches `DashboardShell.jsx` |

All 7 high-fidelity screen prototypes (Login, Admin/Teacher/Student Dashboard,
Quiz Attempt, AI Chatbot, Performance Analytics) were designed against this
exact system — match them pixel-for-pixel when building out each dashboard.

---

## Sprint Plan (2 weeks each)

| Sprint | Focus | Status |
|---|---|---|
| 1 | Foundation, DB schemas, repo setup | ✅ Done |
| 2 | Auth: JWT, bcrypt, RBAC, credential email | ✅ Done |
| 3 | Courses, CSV enrollment, file upload (local disk for now) | ✅ Done |
| 4 | RAG Engine core (pdf-parse, chunking, OpenAI API) | 🔲 |
| 5 | AI quiz generation, JSON enforcement, publish | 🔲 |
| 6 | AI grading + HITL approval panel | 🔲 (approval panel done ahead of schedule as US-06 substrate; AI drafting still pending) |
| 7 | AI chatbot + timed quiz + auto-save | 🔲 (quiz + auto-save done ahead of schedule as US-08; chatbot/US-07 still pending) |
| 8 | Fee challan / salary slip PDF generation | 🔲 |
| 9 | Analytics dashboard, regression testing, polish | 🔲 |

---

## Coding Conventions to Follow

- Every new backend feature: Model → Controller → Route, wired with
  `protect` + `authorize` exactly like `userRoutes.js`
- Every controller wrapped in `express-async-handler` (see existing pattern)
- Standard response shape everywhere: `{ success: true/false, data/message }`
- Never store secrets in code — always `.env`, never commit `.env` (already gitignored)
- Run `npm audit` after adding any new package — keep it at 0 vulnerabilities
  (we already had to patch nodemailer and bump vite/react-router-dom for this)
- Match error handling style in `errorMiddleware.js` for Mongoose duplicate
  keys, validation errors, and cast errors

---

## Full Reference Documents

If deeper detail is needed on any topic (API contracts, ER diagram, full
test case list, quality attributes, deployment plan), check `docs/` in this
repo if present, or ask the user to paste the relevant section from the
Phase 2 SDS — they have the complete document.
