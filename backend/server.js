const path = require("path");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");

dotenv.config();

const connectDB = require("./config/db");
const User = require("./models/User");
const { UPLOAD_DIR } = require("./middleware/upload");

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error("JWT_SECRET must be set to a random value of 32+ characters in production.");
  process.exit(1);
}

connectDB();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

// Same-origin in production; an explicit allow-list otherwise.
const allowed = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",").map((s) => s.trim());
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)) }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Small in-memory rate limiter (per IP).
function rateLimit(windowMs, max) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const n = (hits.get(req.ip) || 0) + 1;
    hits.set(req.ip, n);
    if (n > max) return res.status(429).json({ msg: "Too many requests, please try again later." });
    next();
  };
}
app.use("/api/auth/login", rateLimit(15 * 60 * 1000, 30));
app.use("/api/auth/register", rateLimit(60 * 60 * 1000, 20));
app.use("/api/auth/forgot-password", rateLimit(15 * 60 * 1000, 15));
app.use("/api", rateLimit(60 * 1000, 300));

// Read-only demo accounts may browse but never write.
app.use("/api", async (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("demoReadOnly");
    if (user && user.demoReadOnly) {
      return res.status(403).json({ msg: "This demo account is read-only. Sign up as a student to try registering for events." });
    }
  } catch (e) {
    // invalid tokens are rejected by the route's own auth middleware
  }
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

require("./config/passport");
app.use(passport.initialize());

app.use("/api/auth", require("./routes/authRoutes"));

// Google OAuth is only enabled when credentials are configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
      const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontend}/login?token=${req.user.token}`);
    }
  );
}

app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/registrations", require("./routes/registrationRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/comments", require("./routes/commentRoutes"));

// Neutral built-in banner first, then admin uploads from UPLOAD_DIR (never backend/uploads in git).
app.use("/uploads", express.static(path.join(__dirname, "demo-assets")));
app.use("/uploads", express.static(UPLOAD_DIR, { setHeaders: (res) => res.setHeader("Content-Disposition", "inline") }));

// Background reminder emails only run when email is configured.
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  require("./utils/reminderJob")();
}

// Serve the built React app when present (single-service deployment).
const buildDir = path.join(__dirname, "..", "frontend", "build");
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(buildDir, "index.html")));
}

app.use((err, req, res, next) => {
  if (err && (err.name === "MulterError" || /Only JPEG/.test(err.message))) {
    return res.status(400).json({ msg: err.message });
  }
  console.error(err);
  res.status(500).json({ msg: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
