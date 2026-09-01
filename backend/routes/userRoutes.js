const express = require("express");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { createUser } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");

const router = express.Router();

// All routes below require a valid JWT AND the admin role.
router.use(protect, authorize("admin"));

// US-01 — Admin creates a user account.
router.post("/", createUser);

// GET /api/users?role=student — list users, optionally filtered by role.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  })
);

// PUT /api/users/:id — update name / active status.
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (name !== undefined) user.name = name;
    if (isActive !== undefined) user.isActive = isActive;
    await user.save();

    res.status(200).json({ success: true, data: user });
  })
);

module.exports = router;
