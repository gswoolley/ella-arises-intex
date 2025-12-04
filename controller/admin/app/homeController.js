const getAdminHome = (req, res) => {
  const hour = new Date().getHours();
  let greeting = 'Good afternoon';

  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 18) {
    greeting = 'Good evening';
  }

  res.render('admin/app/home-dashboard', {
    user: req.session.user,
    greeting,
  });
};

module.exports = {
  getAdminHome,
};
