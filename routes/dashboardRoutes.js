const express = require('express');
const { getDashboard } = require('../controller/dashboardController');

const router = express.Router();

router.get('/', getDashboard);

module.exports = router;
