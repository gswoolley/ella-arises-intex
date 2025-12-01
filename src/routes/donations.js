const express = require("express");
const router = express.Router();

// TODO: Implement Donations routes
router.get("/new", (req, res) => res.render("donations/new"));
module.exports = router;
