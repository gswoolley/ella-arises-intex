const getAdminHome = (req, res) => {
  res.render('admin/app/home', { user: req.session.user });
};

module.exports = {
  getAdminHome,
};
