const getAdminGateway = (req, res) => {
  // TODO: replace this with auth-aware logic (e.g., if logged in, redirect to admin home)
  res.render('admin-gateway');
};

module.exports = {
  getAdminGateway,
};
