/**
 * Demo Survey Controller
 * Handles QR code display, survey form submission, and CSV downloads
 * 
 * Routes:
 * - GET /qrcode - Display QR code with progress tracking
 * - GET /qrcode/progress - API endpoint for real-time progress updates
 * - GET /qrcode/download - Download survey results as CSV
 * - POST /qrcode/reset - Clear all demo survey submissions
 * - GET /demo-survey - Display survey form
 * - POST /demo-survey - Submit survey response
 */

const {
  getDemoSurveyCount,
  getAllDemoSurveys,
  createDemoSurvey,
  clearDemoSurveys,
} = require('../models/demoSurveyRepository');

// Target number of submissions to reach 100% (default, can be changed on QR page)
const TARGET_SUBMISSIONS = 6;

// Render the QR code page with progress bar
async function getQRCodePage(req, res) {
  try {
    const count = await getDemoSurveyCount();
    const progress = Math.min((count / TARGET_SUBMISSIONS) * 100, 100);
    
    res.render('demo/qrcode', {
      count,
      target: TARGET_SUBMISSIONS,
      progress: Math.round(progress),
      surveyUrl: `${req.protocol}://${req.get('host')}/demo-survey`,
    });
  } catch (error) {
    console.error('Error loading QR code page:', error);
    res.status(500).send('Error loading page');
  }
}

// API endpoint to get current progress
async function getProgress(req, res) {
  try {
    const count = await getDemoSurveyCount();
    const progress = Math.min((count / TARGET_SUBMISSIONS) * 100, 100);
    const isComplete = count >= TARGET_SUBMISSIONS;
    
    res.json({
      count,
      target: TARGET_SUBMISSIONS,
      progress: Math.round(progress),
      isComplete,
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
}

// API endpoint to download CSV
async function downloadCSV(req, res) {
  try {
    const surveys = await getAllDemoSurveys();
    
    if (surveys.length === 0) {
      return res.status(404).send('No data available');
    }
    
    // Generate CSV header
    const headers = Object.keys(surveys[0]).filter(key => key !== 'rowid');
    let csv = headers.join(',') + '\n';
    
    // Generate CSV rows
    surveys.forEach(survey => {
      const row = headers.map(header => {
        const value = survey[header] || '';
        // Escape commas and quotes in values
        if (value.toString().includes(',') || value.toString().includes('"')) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += row.join(',') + '\n';
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=demo_survey_results.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).send('Error generating CSV');
  }
}

// Render the demo survey form
function getDemoSurveyForm(req, res) {
  res.render('demo/survey-form', {
    message: req.query.message || null,
  });
}

// Handle demo survey form submission
async function submitDemoSurvey(req, res) {
  try {
    await createDemoSurvey(req.body);
    res.redirect('/demo-survey?message=' + encodeURIComponent('Thank you! Your response has been recorded.'));
  } catch (error) {
    console.error('Error submitting demo survey:', error);
    res.redirect('/demo-survey?message=' + encodeURIComponent('Error submitting survey. Please try again.'));
  }
}

// Reset demo (clear all submissions)
async function resetDemo(req, res) {
  try {
    await clearDemoSurveys();
    res.redirect('/qrcode');
  } catch (error) {
    console.error('Error resetting demo:', error);
    res.status(500).send('Error resetting demo');
  }
}

module.exports = {
  getQRCodePage,
  getProgress,
  downloadCSV,
  getDemoSurveyForm,
  submitDemoSurvey,
  resetDemo,
};
