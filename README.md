# Novva LMS — AI-Powered Learning Management System

Monorepo containing the backend (Node.js/Express/MongoDB) and frontend
(React/Vite/Tailwind) for Novva LMS.

**Current scope: Sprint 1 + Sprint 2** — Foundation, Authentication (US-01, US-02).
Everything else (courses, RAG engine, quizzes, chatbot, analytics, finance) is
scaffolded as placeholders and will be built sprint by sprint per the SDS.

---

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance — either:
  - **Local**: install MongoDB Community Server and run it on `mongodb://127.0.0.1:27017`
  - **Atlas (recommended)**: create a free cluster at https://cloud.mongodb.com and copy its connection string

---

## 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
MONGODB_URI=<your connection string>
JWT_SECRET=<run: openssl rand -base64 48>
ADMIN_EMAIL=admin@ucp.edu.pk
ADMIN_PASSWORD=ChangeMe123!
```

Create your first Admin account (this is how you log in for the first time —
after that, the Admin creates every other account via `POST /api/users`,
which is US-01):

```bash
npm run seed:admin
```

Start the server:

```bash
npm run dev
```

You should see:
```
[DB] MongoDB connected: <your-host>
[Server] Novva LMS API listening on port 5000 (development)
```

Confirm it's alive: open http://localhost:5000/api/health

---

## 3. Frontend Setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — you'll land on the Login page.

Log in with the Admin credentials from your `.env` (`ADMIN_EMAIL` /
`ADMIN_PASSWORD`) and you'll be routed to `/admin`.

---

## 4. What's actually working right now

| Feature | Status |
|---|---|
| JWT login + role-based redirect (US-02) | ✅ Working |
| bcrypt password hashing (salt rounds: 10) | ✅ Working |
| RBAC middleware (blocks wrong-role access) | ✅ Working |
| Admin creates users + auto credential email (US-01) | ✅ Working (email logs to console until SMTP is configured) |
| Graceful DB-down handling | ✅ Working |
| Global error handler with standard `{success, message}` shape | ✅ Working |
| Course management, file upload (US-03, US-04) | 🔲 Sprint 3 |
| RAG Engine (US-05 core) | 🔲 Sprint 4 |
| AI Quiz Generation (US-05) | 🔲 Sprint 5 |
| HITL Grading (US-06) | 🔲 Sprint 6 |
| AI Chatbot + Timed Quiz (US-07, US-08) | 🔲 Sprint 7 |
| Fee Challan / Salary Slip PDFs (US-09, US-10) | 🔲 Sprint 8 |
| Analytics Dashboard (US-11) | 🔲 Sprint 9 |

---

## 5. Project Structure

```
novva-lms/
├── backend/
│   ├── config/db.js              MongoDB connection
│   ├── models/User.js            Schema Table 1 from SDS
│   ├── middleware/
│   │   ├── authMiddleware.js     JWT verification (protect)
│   │   ├── rbacMiddleware.js     Role gate (authorize)
│   │   └── errorMiddleware.js    Global error handler
│   ├── controllers/authController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── userRoutes.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   └── sendEmail.js
│   ├── scripts/seedAdmin.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js          JWT-aware HTTP client
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   └── DashboardShell.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── AdminDashboard.jsx
        │   ├── TeacherDashboard.jsx
        │   └── StudentDashboard.jsx
        └── App.jsx
```

---

## 6. Security notes carried over from the SDS

- Passwords are never stored or logged in plain text (bcrypt, salt rounds 10)
- JWT payload contains only `{ id, role }` — no PII
- JWT expires after 7 days (`JWT_EXPIRES_IN`)
- Every protected route runs `protect` (JWT check) before `authorize` (role check) — matching our architecture diagram's `Auth → RBAC → Controller` flow
- `.env` is gitignored — never commit real secrets
