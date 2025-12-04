const getDataAnalysis = (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.redirect('/admin/login');
  }

  res.render('admin/app/data-analysis', {
    user,
  });
};

module.exports = {
  getDataAnalysis,
};