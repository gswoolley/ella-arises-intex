const express = require('express');
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
} = require('../controller/admin/app/eventsController');
const { getDataAnalysis } = require('../controller/admin/app/dataAnalysisController');

const router = express.Router();

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
router.post(
  '/donations/prepare',
  ensureAuthenticated,
  ensureManager,
  createDonation.prepare
);
router.post('/donations', ensureAuthenticated, ensureManager, createDonation.create);
router.post(
  '/donations/:id/update',
  ensureAuthenticated,
  ensureManager,
  updateDonation
);
router.post(
  '/donations/:id/delete',
  ensureAuthenticated,
  ensureManager,
  deleteDonation
);

// Events admin view
router.get('/events', ensureAuthenticated, getEvents);

// Events actions (manager only)
router.post('/events/:id/update', ensureAuthenticated, ensureManager, updateEvent);
router.post('/events/:id/delete', ensureAuthenticated, ensureManager, deleteEvent);

// Data analysis admin view
router.get('/data-analysis', ensureAuthenticated, getDataAnalysis);

// Manager corner (only for manager accounts)
router.get('/manager', ensureAuthenticated, ensureManager, getManagerCorner);

// Manager corner actions
router.post('/manager/:id/approve', ensureAuthenticated, ensureManager, approveRequest);
router.post('/manager/:id/reject', ensureAuthenticated, ensureManager, rejectRequest);
router.post(
  '/manager/users/:id/elevate',
  ensureAuthenticated,
  ensureManager,
  elevateUser
);
router.post(
  '/manager/users/:id/demote',
  ensureAuthenticated,
  ensureManager,
  demoteUser
);
router.post(
  '/manager/users/:id/delete',
  ensureAuthenticated,
  ensureManager,
  deleteUser
);

// Logout
router.post('/logout', handleLogout);

module.exports = router;