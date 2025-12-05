// Dashboard Routes - Public data visualization (no auth required)

const express = require('express');
const { getDashboard } = require('../controller/dashboardController');

const router = express.Router();

// Public dashboard route - No authentication required
// Displays data visualizations and statistics for public viewing
router.get('/', getDashboard);

module.exports = router;
