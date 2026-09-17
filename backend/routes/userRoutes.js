const express = require("express");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Program = require("../models/Program");
const { createUser } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");

const router = express.Router();

router.use(protect);

// US-01 — Admin creates a user account.
router.post("/", authorize("admin"), createUser);

// GET /api/users?role=student — list users, optionally filtered by role.
// Also open to a Registrar: they need this to populate the teacher picker
// when creating a CourseOffering (see AdminCourses.jsx, reused by
// RegistrarDashboard) — narrower than full admin power (no create/edit
// below), matching the roadmap doc's "none of these need full admin
// power" framing.
router.get(
  "/",
  authorize("admin", "registrar"),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  })
);

// PUT /api/users/:id — update name / active status / program. Admin only.
// programId is meaningful only for a student account — lets an admin
// assign or change a student's degree Program any time after the account
// already exists (most realistic flow: Programs get defined well after
// students are already enrolled), not just at creation.
router.put(
  "/:id",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { name, isActive, programId } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (name !== undefined) user.name = name;
    if (isActive !== undefined) user.isActive = isActive;
    if (programId !== undefined) {
      if (programId) {
        const program = await Program.findById(programId);
        if (!program) {
          res.status(400);
          throw new Error("programId must belong to an existing program");
        }
      }
      user.program = programId || null;
    }
    await user.save();

    res.status(200).json({ success: true, data: user });
  })
);

module.exports = router;
