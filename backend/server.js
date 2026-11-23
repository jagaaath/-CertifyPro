
// server.js — Main Entry Point

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Student = require("./models/Student");

const app = express();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server and local development requests without an Origin.
      if (!origin || origin.startsWith("http://localhost:") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("This origin is not allowed by CORS."));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/certificate", require("./routes/certificateRoutes"));
app.use("/api/faculty", require("./routes/facultyRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Certificate Management System API is running.",
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack || err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ============================================
// START SERVER AFTER DATABASE CONNECTION
// ============================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await connectDB();

    // Wait for the Student schema's unique indexes.
    await Student.init();

    console.log("Student database indexes are ready.");

    app.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
