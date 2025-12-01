const express = require("express");
const router = express.Router();

// TODO: Implement Events CRUD
router.get("/", (req, res) => res.render("events/list"));
module.exports = router;
