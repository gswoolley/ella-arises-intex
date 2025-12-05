// Admin Routes - Authentication, CRUD operations, and CSV upload

const express = require('express');
const multer = require('multer'); // File upload middleware
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser'); // CSV parsing library
const knex = require('../util/db'); // Database connection
const mapCsvRowsToStaging = require('../etl/mapCsvToStaging'); // Maps CSV to staging table
const runNormalization = require('../etl/normalize'); // Normalizes staging data to main tables
const { getAdminGateway } = require('../controller/admin/auth/adminGatewayController');
const {
  renderLogin,
  handleLogin,
  handleLogout,
} = require('../controller/admin/auth/loginController');
const {
  renderRequestAccess,
  handleRequestAccess,
} = require('../controller/admin/auth/accountRequestController');
const { getAdminHome } = require('../controller/admin/app/homeController');
const {
  getManagerCorner,
  approveRequest,
  rejectRequest,
  elevateUser,
  demoteUser,
  deleteUser,
  editAccountRequest,
  editUser,
  deleteAccountRequest,
} = require('../controller/admin/app/managerController');
const {
  getDonations,
  createDonation,
  updateDonation,
  deleteDonation,
} = require('../controller/admin/app/donationsController');
const {
  getEvents,
  updateEvent,
  deleteEvent,
  addEventFromTemplate,
  addEventWithNewTemplate,
} = require('../controller/admin/app/eventsController');
const {
  getParticipants,
  getParticipantDetails,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  updateSurvey,
  deleteSurvey,
} = require('../controller/admin/app/participantsController');
const { getUploadPage } = require('../controller/uploadController');
const { getDataAnalysis } = require('../controller/admin/app/dataAnalysisController');

const router = express.Router();

// Configure multer to store uploaded files in the uploads directory
const upload = multer({ dest: path.join(__dirname, '../uploads') });

// Middleware: Check if user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/admin/login');
}

// Middleware: Check if user is a manager
function ensureManager(req, res, next) {
  if (req.session && req.session.user && req.session.user.permission === 'manager') {
    return next();
  }
  if (req.session) {
    req.session.managerNotice = 'Manager Corner is only available to manager accounts.';
  }
  return res.redirect('/admin/home');
}

// Public routes (no auth required)

// Admin entry point – public gateway that redirects based on auth status
router.get('/', getAdminGateway);

// Login routes - Display login form and handle login submission
router.get('/login', renderLogin);
router.post('/login', handleLogin);

// Account request routes - Allow new users to request access
router.get('/create', renderRequestAccess);
router.post('/create', handleRequestAccess);

// Authenticated routes

// Admin home page - Dashboard for authenticated users
router.get('/home', ensureAuthenticated, getAdminHome);

// Donations routes

// View all donations (any authenticated user)
router.get('/donations', ensureAuthenticated, getDonations);

// Donations CRUD actions (manager only)
router.post('/donations/prepare', ensureAuthenticated, ensureManager, createDonation.prepare);
router.post('/donations', ensureAuthenticated, ensureManager, createDonation.create);
router.post('/donations/:id/update', ensureAuthenticated, ensureManager, updateDonation);
router.post('/donations/:id/delete', ensureAuthenticated, ensureManager, deleteDonation);

// Events routes

// View all events (any authenticated user)
router.get('/events', ensureAuthenticated, getEvents);

// Events CRUD actions (manager only)
// Add event from existing template
router.post('/events/add-from-template', ensureAuthenticated, ensureManager, addEventFromTemplate);
// Add event and create new template simultaneously
router.post('/events/add-with-new-template', ensureAuthenticated, ensureManager, addEventWithNewTemplate);
router.post('/events/:id/update', ensureAuthenticated, ensureManager, updateEvent);
router.post('/events/:id/delete', ensureAuthenticated, ensureManager, deleteEvent);

// Participants routes

// View all participants (any authenticated user)
router.get('/participants', ensureAuthenticated, getParticipants);
// View detailed information for a specific participant
router.get('/participants/:id/details', ensureAuthenticated, getParticipantDetails);

// Participants CRUD actions (manager only)
router.post('/participants', ensureAuthenticated, ensureManager, addParticipant);
router.post('/participants/:id/update', ensureAuthenticated, ensureManager, updateParticipant);
router.post('/participants/:id/delete', ensureAuthenticated, ensureManager, deleteParticipant);

// Milestones routes (manager only)

router.post('/milestones', ensureAuthenticated, ensureManager, addMilestone);
router.post('/milestones/:id/update', ensureAuthenticated, ensureManager, updateMilestone);
router.post('/milestones/:id/delete', ensureAuthenticated, ensureManager, deleteMilestone);

// Surveys routes (manager only)

router.post('/surveys/:id/update', ensureAuthenticated, ensureManager, updateSurvey);
router.post('/surveys/:id/delete', ensureAuthenticated, ensureManager, deleteSurvey);

// Data analysis route

// Display Tableau dashboard for data visualization
router.get('/data-analysis', ensureAuthenticated, getDataAnalysis);

// CSV upload routes (manager only)

// Display CSV upload page with results from most recent upload
router.get('/csv-upload', ensureAuthenticated, ensureManager, getUploadPage);
// Handle CSV upload and normalization pipeline
router.post('/csv-upload', ensureAuthenticated, ensureManager, upload.single('csvFile'), async (req, res) => {
  // Validate that a file was uploaded
  if (!req.file) {
    return res.redirect('/admin/csv-upload?error=' + encodeURIComponent('No file uploaded. Please choose a CSV file.'));
  }

  const filePath = req.file.path;
  const rows = [];

  try {
    console.log('--- Upload started ---');
    console.log('[upload] Received file', { originalname: req.file.originalname, size: req.file.size, path: filePath });
    
    // Step 1: Clear normalized staging tables to show only new upload data
    // These tables track what was added in this specific upload
    console.log('[upload] Clearing normalized staging tables');
    await knex('staging_personinfo').truncate();
    await knex('staging_donations').truncate();
    await knex('staging_participantmilestones').truncate();
    await knex('staging_eventtypes').truncate();
    await knex('staging_eventinstances').truncate();
    await knex('staging_participantattendanceinstances').truncate();
    await knex('staging_surveyinstances').truncate();
    console.log('[upload] Normalized staging tables cleared');
    
    // Step 2: Parse CSV file and read all rows into memory
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv()) // Parse CSV format
        .on('data', (data) => {
          rows.push(data); // Collect each row
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('[upload] Finished reading CSV file', { rowCount: rows.length });

    // Step 3: Map CSV columns to staging table and insert raw data
    await mapCsvRowsToStaging(knex, rows);
    
    // Step 4: Run normalization to transform raw data into normalized schema
    // This also populates the staging_* tables with newly normalized data
    await runNormalization(knex);

    // Clean up uploaded file
    fs.unlink(filePath, () => {});

    console.log('--- Upload + normalization completed successfully ---');
    // Redirect with success message and flag to show results
    res.redirect('/admin/csv-upload?message=' + encodeURIComponent('Upload and normalization completed successfully.') + '&showResults=true');
  } catch (err) {
    console.error('Error during upload/normalization:', err);
    fs.unlink(filePath, () => {}); // Clean up file on error
    res.redirect('/admin/csv-upload?error=' + encodeURIComponent('An error occurred while processing the CSV. Check server logs for details.'));
  }
});

// Manager corner routes (manager only)

// Display manager corner page with account requests and user management
router.get('/manager', ensureAuthenticated, ensureManager, getManagerCorner);

// Account request management actions
router.post('/manager/:id/approve', ensureAuthenticated, ensureManager, approveRequest);
router.post('/manager/:id/reject', ensureAuthenticated, ensureManager, rejectRequest);
router.post('/manager/requests/:id/edit', ensureAuthenticated, ensureManager, editAccountRequest);
router.post('/manager/requests/:id/delete', ensureAuthenticated, ensureManager, deleteAccountRequest);

// User management actions
router.post('/manager/users/:id/edit', ensureAuthenticated, ensureManager, editUser);
router.post('/manager/users/:id/elevate', ensureAuthenticated, ensureManager, elevateUser); // Promote to manager
router.post('/manager/users/:id/demote', ensureAuthenticated, ensureManager, demoteUser); // Demote to regular user
router.post('/manager/users/:id/delete', ensureAuthenticated, ensureManager, deleteUser);

// Logout route

// Handle user logout and session destruction
router.post('/logout', handleLogout);

module.exports = router;
