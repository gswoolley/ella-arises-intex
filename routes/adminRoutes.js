const express = require('express');
const { getAdminGateway } = require('../controller/adminGatewayController');
const {
  renderLogin,
  handleLogin,
  handleLogout,
} = require('../controller/loginController');
const {
  renderRequestAccess,
  handleRequestAccess,
} = require('../controller/accountRequestController');

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
router.get('/home', ensureAuthenticated, (req, res) => {
  res.render('admin-home', { user: req.session.user });
});

// Logout
router.post('/logout', handleLogout);

module.exports = router;
