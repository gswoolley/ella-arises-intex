const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// TODO: Replace with real database queries once DB is set up.
// For now, store users in memory (resets on server restart).
// In production, users will be fetched from PostgreSQL via Knex.
const users = [
  {
    id: 1,
    email: "manager@ellarises.org",
    password: bcrypt.hashSync("manager123", 10), // Pre-hashed for demo
    role: "manager",
    name: "Manager Demo",
  },
  {
    id: 2,
    email: "user@ellarises.org",
    password: bcrypt.hashSync("user123", 10),
    role: "user",
    name: "Common User Demo",
  },
];

// GET /auth/login - Show login form
router.get("/login", (req, res) => {
  res.render("auth/login", { title: "Login - Ella Rises" });
});

// POST /auth/login - Process login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash("error", "Email and password are required.");
    return res.redirect("/auth/login");
  }

  // TODO: Replace with DB query
  const user = users.find((u) => u.email === email);

  if (!user) {
    req.flash("error", "Email not found. Try manager@ellarises.org");
    return res.redirect("/auth/login");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    req.flash("error", "Incorrect password.");
    return res.redirect("/auth/login");
  }

  // Store user in session
  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  req.flash("success", `Welcome back, ${user.name}!`);
  res.redirect("/");
});

// GET /auth/register - Show register form
router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Register - Ella Rises" });
});

// POST /auth/register - Process registration
router.post("/register", async (req, res) => {
  const { name, email, password, passwordConfirm } = req.body;

  if (!name || !email || !password || !passwordConfirm) {
    req.flash("error", "All fields are required.");
    return res.redirect("/auth/register");
  }

  if (password !== passwordConfirm) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("/auth/register");
  }

  // TODO: Replace with DB query
  const userExists = users.find((u) => u.email === email);
  if (userExists) {
    req.flash("error", "Email is already registered.");
    return res.redirect("/auth/register");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    email,
    password: hashedPassword,
    role: "user", // Default role for new registrations
    name,
  };
  users.push(newUser);

  req.session.user = {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name,
  };
  req.flash("success", `Account created successfully. Welcome, ${name}!`);
  res.redirect("/");
});

// GET /auth/logout - Logout
router.get("/logout", (req, res) => {
  req.session.user = null;
  req.flash("success", "You have been logged out.");
  res.redirect("/");
});

module.exports = router;
