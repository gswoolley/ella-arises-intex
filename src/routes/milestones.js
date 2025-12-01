const express = require("express");
const router = express.Router();

// TODO: Implement Milestones CRUD
router.get("/", (req, res) =>
  res.render("milestones/list", { title: "Milestones" })
);
module.exports = router;
