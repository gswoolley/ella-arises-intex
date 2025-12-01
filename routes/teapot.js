const express = require("express");
const router = express.Router();

// Route required by IS 404: Must return HTTP 418
router.get("/", (req, res) => {
  res.status(418).send("I'm a teapot ☕");
});

module.exports = router;
