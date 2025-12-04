const getDataAnalysis = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  try {
    return res.render('admin/app/data-analysis', {
      user: req.session.user,
    });
  } catch (error) {
    console.error('Error loading data analysis page:', error);
    return res.status(500).send('Error loading data analysis page');
  }
};

module.exports = {
  getDataAnalysis,
};
