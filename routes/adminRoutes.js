const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const knex = require('../util/db');
const mapCsvRowsToStaging = require('../etl/mapCsvToStaging');
const { runNormalization } = require('../etl/normalize');
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
const upload = multer({ dest: path.join(__dirname, '../uploads') });

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/admin/login');
}

function ensureManager(req, res, next) {
  if (req.session && req.session.user && req.session.user.permission === 'manager') {
    return next();
  }
  if (req.session) {
    req.session.managerNotice = 'Manager Corner is only available to manager accounts.';
  }
  return res.redirect('/admin/home');
}

// Admin entry point – public gateway into the admin corner
router.get('/', getAdminGateway);

// Login routes
router.get('/login', renderLogin);
router.post('/login', handleLogin);

// Account request ("Request access") routes
router.get('/create', renderRequestAccess);
router.post('/create', handleRequestAccess);

// Authenticated admin home
router.get('/home', ensureAuthenticated, getAdminHome);

// Donations admin view
router.get('/donations', ensureAuthenticated, getDonations);

// Donations actions (manager only)
router.post('/donations/prepare', ensureAuthenticated, ensureManager, createDonation.prepare);
router.post('/donations', ensureAuthenticated, ensureManager, createDonation.create);
router.post('/donations/:id/update', ensureAuthenticated, ensureManager, updateDonation);
router.post('/donations/:id/delete', ensureAuthenticated, ensureManager, deleteDonation);

// Events admin view
router.get('/events', ensureAuthenticated, getEvents);

// Events actions (manager only)
router.post('/events/add-from-template', ensureAuthenticated, ensureManager, addEventFromTemplate);
router.post('/events/add-with-new-template', ensureAuthenticated, ensureManager, addEventWithNewTemplate);
router.post('/events/:id/update', ensureAuthenticated, ensureManager, updateEvent);
router.post('/events/:id/delete', ensureAuthenticated, ensureManager, deleteEvent);

// Participants admin view
router.get('/participants', ensureAuthenticated, getParticipants);
router.get('/participants/:id/details', ensureAuthenticated, getParticipantDetails);

// Participants actions (manager only)
router.post('/participants', ensureAuthenticated, ensureManager, addParticipant);
router.post('/participants/:id/update', ensureAuthenticated, ensureManager, updateParticipant);
router.post('/participants/:id/delete', ensureAuthenticated, ensureManager, deleteParticipant);

// Milestones actions (manager only)
router.post('/milestones', ensureAuthenticated, ensureManager, addMilestone);
router.post('/milestones/:id/update', ensureAuthenticated, ensureManager, updateMilestone);
router.post('/milestones/:id/delete', ensureAuthenticated, ensureManager, deleteMilestone);

// Surveys actions (manager only)
router.post('/surveys/:id/update', ensureAuthenticated, ensureManager, updateSurvey);
router.post('/surveys/:id/delete', ensureAuthenticated, ensureManager, deleteSurvey);

// Data Analysis
router.get('/data-analysis', ensureAuthenticated, getDataAnalysis);

// CSV Upload (manager only)
router.get('/csv-upload', ensureAuthenticated, ensureManager, getUploadPage);
router.post('/csv-upload', ensureAuthenticated, ensureManager, upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.redirect('/admin/csv-upload?error=' + encodeURIComponent('No file uploaded. Please choose a CSV file.'));
  }

  const filePath = req.file.path;
  const rows = [];

  try {
    console.log('--- Upload started ---');
    console.log('[upload] Received file', { originalname: req.file.originalname, size: req.file.size, path: filePath });
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          rows.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('[upload] Finished reading CSV file', { rowCount: rows.length });

    await mapCsvRowsToStaging(knex, rows);
    await runNormalization(knex);

    fs.unlink(filePath, () => {});

    console.log('--- Upload + normalization completed successfully ---');
    res.redirect('/admin/csv-upload?message=' + encodeURIComponent('Upload and normalization completed successfully.') + '&showResults=true');
  } catch (err) {
    console.error('Error during upload/normalization:', err);
    fs.unlink(filePath, () => {});
    res.redirect('/admin/csv-upload?error=' + encodeURIComponent('An error occurred while processing the CSV. Check server logs for details.'));
  }
});

// Manager corner (only for manager accounts)
router.get('/manager', ensureAuthenticated, ensureManager, getManagerCorner);

// Manager corner actions
router.post('/manager/:id/approve', ensureAuthenticated, ensureManager, approveRequest);
router.post('/manager/:id/reject', ensureAuthenticated, ensureManager, rejectRequest);
router.post('/manager/requests/:id/edit', ensureAuthenticated, ensureManager, editAccountRequest);
router.post('/manager/requests/:id/delete', ensureAuthenticated, ensureManager, deleteAccountRequest);
router.post('/manager/users/:id/edit', ensureAuthenticated, ensureManager, editUser);
router.post('/manager/users/:id/elevate', ensureAuthenticated, ensureManager, elevateUser);
router.post('/manager/users/:id/demote', ensureAuthenticated, ensureManager, demoteUser);
router.post('/manager/users/:id/delete', ensureAuthenticated, ensureManager, deleteUser);

// Logout
router.post('/logout', handleLogout);

module.exports = router;
