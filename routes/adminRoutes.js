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

const router = express.Router();

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/admin/login');
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

// Logout
router.post('/logout', handleLogout);

module.exports = router;
