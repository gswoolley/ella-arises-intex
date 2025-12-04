const bcrypt = require('bcrypt');
const knex = require('../../../util/db');

const renderRequestAccess = (req, res) => {
  res.render('admin/auth/request-access', {
    error: null,
    success: null,
    form: {
      email: '',
      first_name: '',
      last_name: '',
      organization: '',
      message: '',
    },
  });
};

const handleRequestAccess = async (req, res) => {
  const { email, first_name, last_name, organization, message, password } = req.body;

  const baseForm = { email, first_name, last_name, organization, message };

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).render('admin/auth/request-access', {
      error: 'Please fill in email, first name, last name, and password.',
      success: null,
      form: baseForm,
    });
  }

  if (password.length < 8) {
    return res.status(400).render('admin/auth/request-access', {
      error: 'Password must be at least 8 characters long.',
      success: null,
      form: baseForm,
    });
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    await knex('account_requests').insert({
      email,
      first_name,
      last_name,
      organization: organization || null,
      message: message || null,
      password_hash: hash,
      status: 'pending',
    });
    if (req.session) {
      req.session.requestSuccessMessage =
        'Thank you. Your access request has been received and is pending review.';
    }

    return res.redirect('/admin');
  } catch (err) {
    console.error('Error creating account request:', err);

    let errorMessage = 'An unexpected error occurred while submitting your request. Please try again.';

    if (err && err.code === '23505') {
      // Unique violation on email
      errorMessage = 'An account request with this email already exists.';
    }

    return res.status(500).render('admin/auth/request-access', {
      error: errorMessage,
      success: null,
      form: baseForm,
    });
  }
};

module.exports = {
  renderRequestAccess,
  handleRequestAccess,
};
