const express = require("express");
const router = express.Router();

// TODO: Implement Surveys CRUD
router.get("/", (req, res) => res.render("surveys/list"));
module.exports = router;
