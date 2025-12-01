const express = require("express");
const router = express.Router();

// TODO: Implement Milestones CRUD
router.get("/", (req, res) => res.render("milestones/list"));
module.exports = router;
