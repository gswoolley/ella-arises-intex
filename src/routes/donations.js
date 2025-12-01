const express = require("express");
const router = express.Router();

// TODO: Implement Donations CRUD
// Show list of donations or donation form
router.get("/", (req, res) => res.render("donations/new", { title: "Donate" }));

router.get("/new", (req, res) =>
  res.render("donations/new", { title: "Donate" })
);

module.exports = router;
