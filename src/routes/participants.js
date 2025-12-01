const express = require("express");
const router = express.Router();

// TODO: Implement Participants CRUD routes
// Example routes (implement controllers and middleware later)
router.get("/", (req, res) => {
  res.render("participants/list", { title: "Participants (placeholder)" });
});

router.get("/new", (req, res) => {
  res.render("participants/new");
});

router.get("/:id", (req, res) => {
  res.render("participants/show", { id: req.params.id });
});

module.exports = router;
