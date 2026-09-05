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

Four roles: `admin`, `teacher`, `student`, `parent`. A student token must NEVER
be able to reach a teacher or admin route, even if otherwise valid. Enforce
this at the middleware level (`authorize("admin")`, etc.), not inside controllers.
A `parent` account only ever sees data for the student(s) it's explicitly linked
to via `ParentLink` — never course/teacher/admin data.

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

## Database — 15 MongoDB Collections

`Users, Courses, Enrollments, Materials, Quizzes, Questions, QuizAttempts,
Answers, ChatSessions, Messages, FeeChallans, SalarySlips, ParentLinks,
ParentChatSessions, ParentMessages`

`ParentLinks` (added for the parent-portal feature, post-backlog) maps a
`parent`-role User to a `student`-role User — same join-collection shape as
`Enrollments`, admin-managed, never an embedded array on `User`. `ParentChatSessions` +
`ParentMessages` mirror `ChatSessions`/`Messages`' shape for the parent-facing AI chatbot, kept
as separate collections (not reused) since a parent-chat session is keyed by parent+student (not
course) and its messages have no `sources` to cite.

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
| US-06 | Teacher reviews/approves AI grades (HITL) | EP05 | 5 | 6 ✅ |
| US-07 | Student uses context-aware AI chatbot | EP06 | 8 | 7 ✅ |
| US-08 | Student attempts timed quiz, 30s auto-save | EP06 | 5 | 7 ✅ |
| US-09 | Admin generates fee challan PDF | EP07 | 3 | 8 ✅ |
| US-10 | Admin generates salary slip PDF | EP07 | 3 | 8 ✅ |
| US-11 | Student views performance analytics | EP08 | 5 | 9 ✅ |

**✅ = already built and tested. The full 11-story, 47-point backlog is now complete.**

---

## Current Status (Full 47-point backlog complete — Sprints 1-9 all done)

**Verified end-to-end against a real local MongoDB (not mocked) and a real
browser (Playwright click-through, zero console errors), covering every
role (admin/teacher/student) and RBAC boundary (cross-teacher, non-enrolled
student, no-token, cross-student attempt tampering):**
- `backend/models/User.js`, `Course.js`, `Enrollment.js`, `Material.js`,
  `Quiz.js`, `Question.js` (now has `type: "mcq"|"subjective"` + `maxScore` + optional
  `topic` free-text tag, powering US-11's weak-topic analytics — blank on older
  questions, grouped under "Untagged" there),
  `QuizAttempt.js` (now has `maxScore` + `gradingComplete`), `Answer.js`
  (now has `textAnswer`, `gradeStatus`, `score`, `feedback`, `gradedBy`, `gradedAt`,
  `aiDraftScore`, `aiDraftJustification`),
  `ChatSession.js` (one continuous thread per student+course, unique pair, auto-created —
  no session-switching UI, matching QuizAttempt's start-or-resume pattern), `Message.js`
  (role: user/assistant, `sources: [Material]` for citation display), `FeeChallan.js`
  (auto-numbered `CH-<year>-<seq>`, `status: unpaid|paid`), `SalarySlip.js` (`netSalary`
  is a virtual derived from basicSalary+allowances-deductions, never stored, so it can't
  drift out of sync)
- `authController.js` (`login`, `getMe`, `createUser`), `courseController.js`
  (`createCourse`, `getCourses`, `getCourseById`, `bulkEnrollFromCSV`, `getEnrollments`),
  `materialController.js` (`uploadMaterial`, `getMaterials`, `downloadMaterial`, `deleteMaterial`),
  `quizController.js` (`createQuiz`, `generateQuizQuestions`, `getQuizzesForCourse`, `getQuizById`,
  `publishQuiz`, `startOrResumeAttempt`, `getAttemptsForQuiz`), `attemptController.js`
  (`autosaveAnswer`, `submitAttempt`), `gradingController.js` (`getPendingGrades`, `gradeAnswer`),
  `chatController.js` (`getMessages`, `sendMessage`), `feeChallanController.js` (`createFeeChallan`,
  `getFeeChallans`, `setFeeChallanStatus`, `downloadFeeChallanPdf`), `salarySlipController.js`
  (`createSalarySlip`, `getSalarySlips`, `downloadSalarySlipPdf`), `analyticsController.js`
  (`getMyAnalytics` — US-11, `GET /api/analytics/me`)
- `backend/utils/courseAccess.js` — shared `assertCourseAccess` / `assertCourseManager`
  RBAC helpers, reused by courses, materials, quizzes, AND grading
- `backend/utils/scoring.js` — `recomputeAttemptScore`, shared by `submitAttempt` and
  `gradeAnswer` so an attempt's score/maxScore/gradingComplete is always derived the same way
- `backend/middleware/authMiddleware.js` (`protect`), `rbacMiddleware.js` (`authorize`),
  `uploadMiddleware.js` (multer: disk storage for materials, memory storage for CSV)
- `backend/middleware/errorMiddleware.js` (now also maps Multer errors to 400),
  `backend/config/db.js` (graceful DB-down handling)
- `backend/scripts/seedAdmin.js` — bootstraps the first admin
- `frontend/src/pages/Login.jsx`, `AdminDashboard.jsx` + `AdminCourses.jsx` + `AdminUsers.jsx`
  + `AdminFeeChallans.jsx` + `AdminSalarySlips.jsx` (the "Fee Challans"/"Salary Slips" nav
  items that sat unused since Sprint 1 — create form + list + PDF download, paid/unpaid
  toggle for challans),
  `TeacherDashboard.jsx` + `TeacherCourses.jsx` (materials + quiz creation with a per-question
  MCQ/subjective type picker + optional free-text Topic tag, editable on both manually-created
  and AI-generated questions + publish/results) + `GradeApprovals.jsx` (the "Grade Approvals"
  nav item that sat unused since Sprint 1 — now lists every pending subjective answer across
  the teacher's courses with an inline score+feedback form),
  `StudentDashboard.jsx` + `StudentCourses.jsx` (materials + quiz list) + `ChatBot.jsx` (the
  "AI Chatbot" nav item that sat unused since Sprint 1 — course picker, message thread,
  source citations under grounded answers, optimistic send with a "Thinking…" state for
  Gemini's latency), `QuizAttempt.jsx` (dedicated timed quiz-taking screen: countdown,
  resume support, 30s autosave, auto-submit at zero, renders a textarea for subjective
  questions, shows "awaiting teacher review" when the score is still provisional),
  `MyResults.jsx` + `Analytics.jsx` (the "My Results"/"Analytics" nav items that sat unused
  since Sprint 1 — per-quiz score list with pending-review/percentage badges, and a
  per-topic breakdown with a weak-topics callout for anything scoring below 60%)
- `AdminOverview.jsx` / `TeacherOverview.jsx` / `StudentOverview.jsx` — the "Dashboard" nav
  item in all three role dashboards, previously the one remaining unwired placeholder (every
  other nav item was already live). Each is a landing page of stat cards + a short recent-items
  list + quick-link buttons (wired via an `onNavigate` prop that calls the parent dashboard's
  `setActiveNav`, so a click jumps straight to that section) built entirely from existing
  endpoints — no new backend routes needed. Admin sees student/teacher/course counts and unpaid
  challans; Teacher sees course/enrollment/quiz/pending-grade counts (enrollment and quiz counts
  are summed client-side per course via `Promise.all`, fine at this project's per-teacher course
  count); Student sees enrolled-course count, quiz average, and the same weak-topics callout as
  `Analytics.jsx`, reusing `getMyAnalytics()`.
- `AccountSettings.jsx` — self-service "Account Settings" nav item on all three dashboards
  (edit name, change password). Previously the only way to change a password was direct DB
  access — every account was fully admin-provisioned with no self-service path at all.
  `PUT /api/auth/me` (name only; email/role stay admin-managed via `userRoutes.js` for
  auditability) and `PUT /api/auth/me/password` (requires the current password, never a bare
  reset, so a hijacked session token alone can't lock the real owner out) both live in
  `authController.js` next to the existing `login`/`getMe`. Caught one real bug during
  live-testing: a wrong-current-password rejection was originally a 401, which collided with
  `api/axios.js`'s global "401 means invalid/expired session → force logout" interceptor —
  a fully-authenticated user submitting a wrong password was getting silently kicked to the
  login screen instead of seeing an inline error. Fixed by returning 400 instead (a wrong
  password is a validation failure of submitted data, not a session/auth failure).

**Outbound email (`backend/utils/sendEmail.js`) is now live-verified with a real SMTP provider
(Brevo).** It had silently never sent anything before this — `EMAIL_USER`/`EMAIL_PASS` were
blank, and `sendEmail()` is deliberately built to fall back to console-logging the email body
instead of throwing when unconfigured, so account-creation credential emails were only ever
printed to the backend terminal. Fixed a real transport bug in the process: `secure` was
hardcoded `true`, which only works for implicit-TLS port 465 — Brevo's relay
(`smtp-relay.brevo.com:587`) needs STARTTLS instead, so `secure` is now derived from the port
(`port === 465`). Getting an actual message to arrive also required verifying a sender identity
in Brevo's dashboard first (Senders, Domains & Dedicated IPs) — SMTP accepts and queues a send
from an unverified sender (`250 OK`) but then silently drops it before delivery, which looked
identical to a working send until confirmed by checking a real inbox. `EMAIL_FROM` is now the
verified sender. Credentials live only in the gitignored `backend/.env`, never in git history.

**Forgot-password is now built** — the "Forgot password?" link on `Login.jsx` was previously
dead text (no `onClick`, matching the pattern of every other dormant prototype element found
this session). `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` are public
routes (no `protect`) in `authController.js`. Only a SHA-256 hash of the reset token is ever
stored on `User.passwordResetTokenHash` (mirrors `passwordHash`'s own philosophy) — the raw
token exists only in the emailed link, 1-hour expiry, single-use (cleared on success), so a DB
read alone can never forge a reset. `forgotPassword` always returns the same generic message
whether or not the email exists, same enumeration-safe principle as `login`'s `invalidCreds`.
Two new public pages, `ForgotPassword.jsx` and `ResetPassword.jsx` (the latter reads `?token=`
via `useSearchParams`), both public routes in `App.jsx` alongside `/login`. Verified end-to-end
including a real Brevo-delivered reset email and confirming the token is rejected on reuse.

**Parent portal, phase 1 (role + linking) is now built.** `parent` is a fourth role (User.role
enum + `createUser`'s validation array) — `authorize(...)` and `ProtectedRoute` were already
role-agnostic (rest-param / array-membership checks), so neither needed changing. A new
`ParentLink` collection (same shape as `Enrollment` — a join collection, not an embedded array,
for consistency) maps parent User → student User, admin-managed via `POST/GET /api/parent-links`
and `DELETE /api/parent-links/:id`, with `GET /api/parent-links/my-children` (parent-only)
feeding the child list. `AdminParentLinks.jsx` (new "Parent Links" nav item) lets an admin link
any parent account to any student account. Verified end-to-end via curl and Playwright, including
confirming the RBAC boundary actually holds — a parent token gets a 403 on both an admin-only
route and a student-only route (`/api/analytics/me`), not just a missing UI link.

**Phase 2 (parent-facing analytics) is now built.** `analyticsController.js`'s aggregation was
split into `computeAnalyticsForStudent(studentId)` (the pure logic, unchanged) and the thin
`getMyAnalytics` handler that calls it with `req.user._id` — this is the single place "a
student's analytics" is defined, reused rather than duplicated. `parentLinkController.js`'s new
`getChildAnalytics` (`GET /api/parent-links/:studentId/analytics`, parent-only) checks
`ParentLink.exists({parent, student})` BEFORE calling that same function — a parent can only
ever see analytics for a student they're explicitly linked to; confirmed both that a linked
child's data loads (byte-identical to that student's own `/api/analytics/me` response) and that
an unlinked student's ID gets a 403. `ParentDashboard.jsx` now renders the same three sections
students see (`MyResults.jsx` + `Analytics.jsx`'s content, merged into one parent-facing view) —
stat cards, a weak-topics callout, per-quiz results, per-topic breakdown — with a child-picker
tab strip when a parent has more than one linked student (verified against real multi-child data
a live user created via the admin UI mid-session, including the empty-state for a child with no
quiz history yet).

**Phase 3 (AI chatbot) completes the parent portal.** Two new collections mirror the
student-facing chat shape but are kept separate rather than overloading `ChatSession`/`Message`
— `ParentChatSession` (parent+student, not course, since this answers from overall academic
performance) and `ParentMessage` (no `sources` field — nothing to cite, since context is
analytics data, not documents). Both `geminiProvider.js` and `openaiProvider.js` gained a fourth
function, `parentChat`, alongside `generateQuiz`/`chat`/`gradeSubjective` — reusing the RAG
chatbot's `chat()` function directly would have been wrong here (its system prompt explicitly
says "extracted from the course's lecture materials", which doesn't describe analytics data), so
both providers' HTTP-request plumbing was factored into a shared `runChat(systemPrompt, ...)`
helper, with `chat` and `parentChat` each supplying their own prompt. The `parentChat` prompt
tells the AI to answer only from the supplied performance summary, be constructive about weak
topics, and — as defense-in-depth on top of the context itself never containing it —
never state the student's name or email even if asked, referring to them only as "your child".
`parentChatController.buildAnalyticsContext` builds that summary from
`computeAnalyticsForStudent` (topics, scores, recent results) with zero name/email in it,
consistent with CLAUDE.md's PII rule. `getMessages`/`sendMessage`
(`GET`/`POST /api/parent-links/:studentId/chat/messages`, parent-only) both check
`ParentLink.exists()` before touching any data — confirmed via curl that an unlinked student's
ID gets a 403 with no AI call ever made, and that a student-role token is rejected by RBAC before
even reaching the controller. `ParentDashboard.jsx` gained an "AI Assistant" nav item sharing the
same child-picker as the analytics view; verified end-to-end with a real live Gemini call — the
AI correctly answered from real quiz data, referred to the student only as "your child", and
handled a child with zero quiz history by honestly saying so rather than inventing an answer.
- `frontend/src/context/AuthContext.jsx`, `components/ProtectedRoute.jsx`,
  `components/DashboardShell.jsx` (nav is now interactively wired to each dashboard's sections)
- `frontend/src/api/axios.js`, `api/courses.js` (blob-based authenticated file download,
  since JWT is header-based — a plain `<a href>` can't carry it), `api/users.js`,
  `api/quizzes.js`, `api/chat.js`, `api/finance.js`, `api/analytics.js`

**Question.correctOptionIndex is `select: false`** — mirrors `User.passwordHash`'s pattern
exactly, so a student attempting a quiz can never read the answer key out of the API
response. Only explicitly `.select("+correctOptionIndex")` for the owning teacher/admin, or
server-side when grading. **The quiz time limit is enforced server-side** (in
`attemptController.autosaveAnswer`), not just by the frontend countdown — a determined
student can't bypass it via devtools.

**Quiz creation supports both manual and AI-generated paths into the same schema** — a
teacher can build questions directly in `TeacherCourses.jsx` (choosing MCQ or subjective
per question), or click "Generate with AI" to draft MCQ questions from an uploaded PDF
(US-05) into that same question-builder form for review/editing before anything is saved.
Neither path is more canonical than the other; AI generation is additive, not a replacement.

**US-06 (HITL AI grading) is fully built and live-verified.** When a quiz is submitted,
`attemptController.submitAttempt` responds to the student immediately (no added latency —
a real Gemini grading call takes ~20s), then drafts an AI grade for each subjective answer
in the background via `provider.gradeSubjective({question, maxScore, answer})`, storing
the result in `Answer.aiDraftScore`/`aiDraftJustification`. These fields are purely
informational: `Answer.score`/`feedback` (what actually counts toward the attempt's total,
per `recomputeAttemptScore`) are set ONLY when a Teacher saves a grade in Grade Approvals,
which pre-fills from the AI draft (shown with an "AI Suggested: X/Y" badge) but submits
whatever the Teacher actually has in the form — accepted as-is or edited. Confirmed live:
AI drafted 5/5 on a strong answer with an accurate justification, a Teacher then
deliberately overrode it to 4/5 with their own feedback, and the override (not the AI's
draft) became the final grade — proving the HITL boundary actually holds, not just that a
draft gets shown.

**File storage is local disk for now** (`backend/uploads/materials/`, served only via
an authenticated `GET /api/materials/:id/download` route — deliberately not a static
mount, since that would bypass `protect` and leak lecture material to anyone with the
URL). `Material.fileUrl` stores just the local filename today; the field is named to
survive a later swap to a real S3/Cloudinary URL without a migration.

**AI vendor decided: Gemini primary, OpenAI swap-ready.** `backend/services/ai/` is the
External AI Service Layer from CLAUDE.md's own architecture diagram — `index.js` picks
`geminiProvider.js` or `openaiProvider.js` based on the `AI_PROVIDER` env var (default
`gemini`), both implementing the identical `generateQuiz({text, numQuestions})`,
`chat({context, question, history})`, and `gradeSubjective({question, maxScore, answer})`
contracts via native `fetch` (no new HTTP-client dependency) with JSON-schema-enforced
structured output where the response needs to be reliably parseable (quiz generation,
grading — chat is free-text by design). Switching providers is an env var + restart,
never a code change. `backend/services/ragEngine.js` extracts PDF text (`pdf-parse` v2 —
its API is class-based, `new PDFParse({data: buffer}).getText()`, not the v1 function
export most docs/examples show) and chunks it. Quiz generation feeds the AI the full
extracted text (capped at 30,000 chars), since a lecture-PDF-sized document fits a modern
context window and the goal is coverage, not narrow relevance. The chatbot (US-07) is
different — a student's specific question genuinely needs relevance-ranked retrieval, so
`ragEngine.selectRelevantChunks(chunksWithSource, query, topK)` does real RAG step-3
selection: keyword/term-overlap scoring (no embeddings) since this project's local
MongoDB has no vector search index and a full embeddings pipeline (generate + store +
cosine-similarity) is a much bigger lift than this scale needs. Chunks scoring zero are
dropped rather than padded in, so a genuinely off-topic question yields zero context.

**US-07 (AI chatbot) is fully built and live-verified**, including real Gemini calls.
`POST /api/courses/:id/chat/messages` — RAG steps 1-5 per CLAUDE.md, end to end: extract
every PDF material in the course → chunk → select the top 5 relevant chunks for the
question → inject as context → strict system prompt ("answer only from context, else
reply exactly '[refusal]'"). **If no chunk scores above zero, the refusal is returned
without ever calling the AI** — correctness by construction, not by hoping the model
complies with an empty-context instruction. Confirmed live: an off-topic question got the
exact required refusal string instantly (no AI call, no latency); an in-context question
got an accurate answer grounded in the real PDF content, correctly citing which
Material(s) it drew from (`Message.sources`, shown in the UI). One conversation thread per
(student, course) — auto-created, no session list/switcher UI, matching `QuizAttempt`'s
start-or-resume pattern. The system prompt explicitly forbids markdown formatting (no
`**`, `#`, bullets) since this is a plain-text chat window, not a markdown renderer.

**The student chatbot is now "Novva Assistant" (renamed in the UI) — expanded beyond pure
lecture-content Q&A into course-scoped weak-area awareness + a materials list, post-backlog.**
`chatController.sendMessage` now builds three labeled context sections instead of one: LECTURE
EXCERPTS (unchanged — RAG-matched chunks), COURSE MATERIALS (every uploaded material's title,
always included, so "what's been uploaded?" works without a chunk needing to match), and YOUR
PERFORMANCE (`computeAnalyticsForStudent(studentId, {courseId})` — the same US-11 aggregation,
now course-scoped so a weak topic cited in one course's chat can't actually be from another
course's quizzes — formatted via the shared `utils/formatAnalyticsSummary.js`, also reused by
the parent chatbot). This required loosening the old zero-chunks-means-refuse gate: a "where am
I weak?" or "what's uploaded?" question is a legitimate, answerable question even when it
keyword-matches zero lecture chunks, so the code-level zero-cost refusal is now reserved for the
genuinely empty case (no chunks AND no materials AND no quiz history) — once *anything* exists to
ground on, the AI is trusted to route the right section to the right question, per its system
prompt's strict per-section rules (still refusing lecture-content questions the chunks don't
cover, verbatim — confirmed live with an off-topic astronomy question). Improvement suggestions
are explicitly hedged ("likely covers", "worth checking") rather than presented as guaranteed
citations, since there's no stored link between a `Question.topic` and a specific `Material` —
confirmed live that the model actually uses this hedged phrasing rather than overclaiming.
**Known minor imprecision:** `Message.sources` is set whenever any chunk scored non-zero
relevance, even if the AI's actual answer drew from COURSE MATERIALS or YOUR PERFORMANCE instead
of that chunk — the material named is always real, just occasionally attributed to the wrong
answer. Not fixed, since doing so reliably would need classifying which section the model
actually drew from, which isn't cheaply knowable from response text alone.

**Fixed a real gap caught by live user testing, post-backlog:** "what's inside Week 1 Slides?"
and "summarize Week 1 Slides" both hit the refusal, even though that material genuinely exists.
Root cause: `selectRelevantChunks` scores the question's words against each chunk's *body text* —
a plain title reference like "Week 1 Slides" is metadata, not vocabulary that necessarily appears
inside the file's own content, so it scored zero matching chunks and (correctly, per the
system prompt's own rule) the model refused rather than fabricate. Fixed with
`ragEngine.findMentionedMaterials(question, materials)` — scores the question's tokens against
each material's *title* instead (with light singular/plural normalization, since "slide" vs
"slides" would otherwise miss), and when a material is named directly, `chatController` pulls
its FULL extracted content into a new REQUESTED MATERIAL(S) context section (capped at 20,000
chars/material) rather than relying on the narrow top-5 relevance-matched excerpts. If a named
material genuinely has no extractable text (empty, corrupted, or an image-only scan with no text
layer), the assistant says so plainly instead of the generic refusal — confirmed live against a
real edge case: "Week 1 Slides" turned out to be a 40-byte placeholder stub from early testing
with no real content, and the fixed assistant correctly said so instead of either fabricating a
summary or giving the unhelpful generic refusal; a genuinely off-topic question ("What is the
capital of France?") still correctly refused verbatim; and summarizing a real content-bearing
PDF by name now works and is accurate.

**PPTX and DOCX are now fully readable, not just uploadable, post-backlog.** Previously
`uploadMiddleware` accepted all three formats (PDF/PPTX/DOCX, per US-04) but only PDF had any
text extraction — a PPTX or DOCX could be uploaded, listed, and downloaded, but every AI feature
silently ignored it. `ragEngine.js` gained `extractTextFromDocx` (via `mammoth`, pure JS, no
native deps) and `extractTextFromPptx` (no PPTX-specific library — a `.pptx` is just a zip of
per-slide XML, so `JSZip`, already a natural fit for Office Open XML formats, unzips it and a
plain regex pulls every `<a:t>` DrawingML text run out in slide order), plus a dispatcher
`extractText(filePath, fileType)` used everywhere a single format was hardcoded before:
`chatController.buildCourseChunks` (was PDF-only, now all three feed the chatbot's RAG/summary
features) and `quizController.generateQuizQuestions` (the old `fileType !== "pdf"` 400 rejection
is gone — AI quiz generation now works from any accepted format). The teacher's "Generate with
AI" material picker (`TeacherCourses.jsx`) was also still hardcoded to filter to PDF-only in two
places — a leftover from before this fix — now shows every uploaded material. Verified live
end-to-end with real (minimal but genuine) `.docx` and `.pptx` files: the chatbot accurately
summarized both by name with correct source attribution, and AI quiz generation produced
accurate, correctly answer-keyed MCQs directly from a real `.docx`'s content.

**Upload-time extraction check, post-backlog** — closes the exact class of bug that caused the
"Week 1 Slides" confusion above (a 40-byte stub sat in the DB unflagged for days before a
student's question exposed it). `materialController.uploadMaterial` now attempts
`ragEngine.extractText` immediately on upload and stores the result (or lack of one) as
`Material.textExtractionWarning` — never blocking the upload itself, since a human should decide
whether an image-heavy deck is still worth keeping, just surfacing the problem right away instead
of silently. Below 20 extracted characters counts as "no usable text" (low enough that a
legitimately terse real slide, e.g. a title-only slide, isn't false-flagged). The teacher sees
the warning immediately after upload AND as a persistent ⚠ badge (hover for the reason) next to
that material going forward — `getMaterials` already returns the full document, so no extra
endpoint was needed. Pre-existing materials uploaded before this field existed (including "Week 1
Slides" itself) are NOT retroactively checked — `textExtractionWarning` stays `null` for them
until re-uploaded, since a bulk backfill wasn't asked for. Verified live: a genuinely empty PDF
correctly warns, a real content-bearing DOCX correctly doesn't.

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

**US-09/US-10 (fee challan / salary slip PDFs) are fully built and verified**, including
a real access-check bug caught by live testing: the RBAC check compared a populated
Mongoose ref (`challan.student` after `.populate()`) directly against a raw ObjectId,
which never matches — always falsy for anyone but an admin. Fixed by unwrapping `._id`
first (`challan.student._id || challan.student`, so the same helper works whether the
caller populated the field or not). PDFs are generated with `pdfkit` (pure JS, no
headless-browser dependency) and streamed through an authenticated route — never a
static mount — so only an admin or the owning student/employee can fetch one.
`backend/config/institution.js` reads the institution name/address/contact from env vars
with UCP as the default, so the PDF templates (the single most likely place to
accidentally hardcode "University of Central Punjab") stay swappable per the
white-label decision.

**US-11 (performance analytics) is now complete — the full 47-point backlog is done.**
`GET /api/analytics/me` (Student only) walks every one of the student's submitted
`QuizAttempt`s, cross-references each attempt's `Question`s/`Answer`s using the exact
same resolution rules as `utils/scoring.js`'s `recomputeAttemptScore` (MCQ always
resolved inline; a subjective question only contributes once a Teacher has set
`gradeStatus: "graded"`, so a topic's accuracy is never skewed by an answer still
awaiting HITL review), and returns three things: a per-quiz results list, a per-topic
points-earned/points-possible breakdown (grouped under "Untagged" for any question with
no topic tag — expected for every pre-existing quiz, since `Question.topic` is a new,
optional field), and an `overall.weakTopics` list (topics scoring below 60%, capped at 5)
that both `MyResults.jsx` ("My Results" nav item) and `Analytics.jsx` ("Analytics" nav
item) render — nav items that, like Grade Approvals/AI Chatbot/Fee Challans/Salary Slips
before them, sat unused since Sprint 1 until now. Live-verified via Playwright against
real submitted-quiz data (7 attempts, one real topic bucket) with zero console errors.

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
| 4 | RAG Engine core (pdf-parse, chunking, OpenAI API) | ✅ Done |
| 5 | AI quiz generation, JSON enforcement, publish | ✅ Done |
| 6 | AI grading + HITL approval panel | ✅ Done |
| 7 | AI chatbot + timed quiz + auto-save | ✅ Done |
| 8 | Fee challan / salary slip PDF generation | ✅ Done |
| 9 | Analytics dashboard, regression testing, polish | ✅ Done (analytics dashboard shipped; regression/polish pass still open-ended) |

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
