const getAdminGateway = (req, res) => {
  // If already authenticated, skip the gateway and go straight to admin home
  if (req.session && req.session.user) {
    return res.redirect('/admin/home');
  }

  let requestSuccess = null;
  if (req.session && req.session.requestSuccessMessage) {
    requestSuccess = req.session.requestSuccessMessage;
    delete req.session.requestSuccessMessage;
  }

  return res.render('admin-gateway', { requestSuccess });
};

module.exports = {
  getAdminGateway,
};
