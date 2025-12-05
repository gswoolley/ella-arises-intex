/**
 * Demo Survey Routes
 * Handles all routes for the demo survey feature
 * 
 * Routes defined:
 * - GET /qrcode - QR code display page with progress tracking
 * - GET /qrcode/progress - API endpoint for live progress updates
 * - GET /qrcode/download - Download survey results as CSV
 * - POST /qrcode/reset - Clear all demo survey submissions
 * - GET /demo-survey - Survey form page
 * - POST /demo-survey - Submit survey response
 */

const express = require('express');
const {
  getQRCodePage,
  getProgress,
  downloadCSV,
  getDemoSurveyForm,
  submitDemoSurvey,
  resetDemo,
} = require('../controller/demoSurveyController');

const router = express.Router();

// QR code display page with live progress bar
router.get('/qrcode', getQRCodePage);

// API endpoint for progress updates (polled by QR code page)
router.get('/qrcode/progress', getProgress);

// Download CSV of demo survey results
router.get('/qrcode/download', downloadCSV);

// Reset demo (clear all submissions)
router.post('/qrcode/reset', resetDemo);

// Demo survey form page
router.get('/demo-survey', getDemoSurveyForm);

// Handle demo survey form submission
router.post('/demo-survey', submitDemoSurvey);

module.exports = router;
