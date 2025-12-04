const bcrypt = require('bcrypt');
const knex = require('../../../util/db');

const renderLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/admin/home');
  }

  res.render('admin/auth/login', { error: null, email: '' });
};

const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('admin/auth/login', {
      error: 'Please enter both email and password.',
      email: email || '',
    });
  }

  try {
    const user = await knex('loginpermissions').where({ email }).first();

    if (!user) {
      return res.status(401).render('admin/auth/login', {
        error: 'Invalid email or password.',
        email,
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).render('admin/auth/login', {
        error: 'Invalid email or password.',
        email,
      });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      permission: user.permission,
    };

    return res.redirect('/admin/home');
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).render('admin/auth/login', {
      error: 'An unexpected error occurred. Please try again.',
      email,
    });
  }
};

const handleLogout = (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.redirect('/admin');
    });
  } else {
    res.redirect('/admin');
  }
};

module.exports = {
  renderLogin,
  handleLogin,
  handleLogout,
};
