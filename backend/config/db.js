// ============================================
// MongoDB Connection Configuration
// Uses Mongoose to connect to MongoDB Atlas
// ============================================

const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// connectDB — Async function to connect MongoDB
// Called once when the server starts
// ─────────────────────────────────────────────
const connectDB = async () => {
  try {
    // Attempt connection using URI from .env
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Success — log which host we connected to
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and exit the process
    // Exiting with code 1 signals an abnormal termination
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;