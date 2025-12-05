// Dashboard Controller - Handles public dashboard page

// Render the public dashboard page
const getDashboard = (req, res) => {
  res.render('public/dashboard');
};

module.exports = {
  getDashboard,
};
