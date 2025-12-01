// Authentication middleware placeholder

exports.ensureAuthenticated = (req, res, next) => {
  // TODO: implement session/auth check
  // if (req.isAuthenticated && req.isAuthenticated()) return next();
  // otherwise redirect to login or return 401
  return next();
};

exports.ensureManager = (req, res, next) => {
  // TODO: check req.user.role === 'manager'
  return next();
};
