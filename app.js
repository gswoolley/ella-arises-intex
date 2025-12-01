const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("connect-flash");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// View engine setup
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

// Body parsing & static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// Flash messages
app.use(flash());

// Make flash and currentUser available to all views
app.use((req, res, next) => {
  res.locals.flash = req.flash();
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use("/", require("./routes/home"));
app.use("/", require("./routes/ping"));
app.use("/auth", require("./routes/auth"));

app.use("/teapot", require("./routes/teapot"));

// --- Scaffolded application routes ---
// The following route modules are placeholders created to match the
// project rubric. Implement controllers, models, and auth checks in
// the corresponding files under `src/` (e.g. `src/controllers`,
// `src/models`, `src/middleware`) and keep mounting them here.
//
// Note: these files are intentionally lightweight so you can iterate
// quickly during development. Update the require paths if you move
// files later.
app.use("/participants", require("./src/routes/participants"));
app.use("/events", require("./src/routes/events"));
app.use("/surveys", require("./src/routes/surveys"));
app.use("/milestones", require("./src/routes/milestones"));
app.use("/donations", require("./src/routes/donations"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
