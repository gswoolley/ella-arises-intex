const express = require("express");
const router = express.Router();

// TODO: Implement Events CRUD
router.get("/", (req, res) => res.render("events/list", { title: "Events" }));
module.exports = router;
