const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", { title: "Ella Rises" });
});

module.exports = router;
