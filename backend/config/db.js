const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI in the environment.
 * The server is designed to still boot even if this fails,
 * so a developer without a database configured yet can still
 * see the API respond on /api/health and read error messages
 * clearly instead of the whole process crashing silently.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "[DB] MONGODB_URI is not set. Copy .env.example to .env and fill it in."
    );
    return;
  }

  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] MongoDB connection failed: ${err.message}`);
    console.error(
      "[DB] The server will keep running, but any route that touches the database will fail until this is fixed."
    );
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected.");
  });
}

module.exports = connectDB;
