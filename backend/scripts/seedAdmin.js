/**
 * Bootstraps the very first Admin account.
 *
 * Why this exists: US-01 says "Admin creates user accounts" — but the
 * very first Admin has to come from somewhere. Run this once against a
 * fresh database:
 *
 *   npm run seed:admin
 *
 * It reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from .env.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    await mongoose.disconnect();
    return;
  }

  const admin = new User({
    name: ADMIN_NAME || "Administrator",
    email: ADMIN_EMAIL.toLowerCase(),
    role: "admin",
  });
  await admin.setPassword(ADMIN_PASSWORD);
  await admin.save();

  console.log("✅ Admin account created:");
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: ${ADMIN_PASSWORD}  (change this after first login)`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
