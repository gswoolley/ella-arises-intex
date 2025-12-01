// Authentication middleware
// These functions check user sessions and role-based permissions
// Wire these into routes that require authentication or specific roles

/**
 * Ensure user is authenticated (logged in)
 * Redirect to login if not authenticated
 */
exports.ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash("error", "You must be logged in to access this page.");
  res.redirect("/auth/login");
};

/**
 * Ensure user has manager role
 * Use after ensureAuthenticated
 * Example: router.get('/admin', ensureAuthenticated, ensureManager, ...)
 */
exports.ensureManager = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === "manager") {
    return next();
  }
  req.flash("error", "You do not have permission to access this page.");
  res.status(403).redirect("/");
};

/**
 * Optional: Ensure user is common user (not manager)
 */
exports.ensureCommonUser = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === "user") {
    return next();
  }
  req.flash("error", "This page is for common users only.");
  res.status(403).redirect("/");
};
