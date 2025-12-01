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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
