const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/home"));
app.use("/", require("./routes/ping"));

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
