const knex = require('../../../util/db');
const authRepository = require('../../../models/authRepository');
const accountRequestRepository = require('../../../models/accountRequestRepository');

const getManagerCorner = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const search = (req.query && req.query.q) || '';
  const statusFilter = (req.query && req.query.status) || 'all';
  const roleFilter = (req.query && req.query.role) || 'all';
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const PAGE_SIZE = 20;

  try {
    const baseUsersQuery = knex('loginpermissions').select(
      'id',
      'email',
      'first_name',
      'last_name',
      'permission'
    );

    if (roleFilter === 'user' || roleFilter === 'manager') {
      baseUsersQuery.where({ permission: roleFilter });
    }

    if (search) {
      baseUsersQuery
        .whereILike('email', `%${search}%`)
        .orWhereILike('first_name', `%${search}%`)
        .orWhereILike('last_name', `%${search}%`);
    }

    const requestsPromise = accountRequestRepository.listRequests({ statusFilter });

    const [
      pendingCount,
      approvedThisMonthCount,
      totalAccountsRow,
      totalUsersRow,
      totalManagersRow,
      requests,
      usersPage,
      usersCountRow,
      allUserEmails,
      allRequestEmails,
    ] = await Promise.all([
      accountRequestRepository.countPendingRequests(),
      accountRequestRepository.countApprovedThisMonth(),
      knex('loginpermissions').count('* as count').first(),
      knex('loginpermissions').where({ permission: 'user' }).count('* as count').first(),
      knex('loginpermissions').where({ permission: 'manager' }).count('* as count').first(),
      requestsPromise,
      baseUsersQuery
        .clone()
        .orderBy('id', 'desc')
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      knex('loginpermissions')
        .modify((qb) => {
          if (search) {
            qb.whereILike('email', `%${search}%`)
              .orWhereILike('first_name', `%${search}%`)
              .orWhereILike('last_name', `%${search}%`);
          }
        })
        .count('* as count')
        .first(),
      knex('loginpermissions').select('email'),
      knex('account_requests').select('email'),
    ]);

    // Create Sets for quick lookup
    const userEmailSet = new Set(allUserEmails.map(u => u.email));
    const requestEmailSet = new Set(allRequestEmails.map(r => r.email));

    const metrics = {
      pending: Number(pendingCount || 0),
      approvedThisMonth: Number(approvedThisMonthCount || 0),
      totalAccounts: Number(totalAccountsRow?.count || 0),
      totalUsers: Number(totalUsersRow?.count || 0),
      totalManagers: Number(totalManagersRow?.count || 0),
    };

    const totalUserMatches = Number(usersCountRow?.count || 0);
    const totalUserPages = Math.max(Math.ceil(totalUserMatches / PAGE_SIZE), 1);

    return res.render('admin/app/manager-corner', {
      user: req.session.user,
      requests,
      metrics,
      users: usersPage,
      userEmailSet,
      requestEmailSet,
      search,
      statusFilter,
      roleFilter,
      usersPage: page,
      usersTotalPages: totalUserPages,
      usersTotalCount: totalUserMatches,
    });
  } catch (error) {
    console.error('Error loading account requests for manager corner:', error);
    return res.status(500).render('admin/app/manager-corner', {
      user: req.session.user,
      requests: [],
      metrics: {
        pending: 0,
        approvedThisMonth: 0,
        totalAccounts: 0,
        totalUsers: 0,
        totalManagers: 0,
      },
      users: [],
      userEmailSet: new Set(),
      requestEmailSet: new Set(),
      search,
      statusFilter,
      roleFilter,
      usersPage: 1,
      usersTotalPages: 1,
      usersTotalCount: 0,
      error: 'Unable to load account requests right now.',
    });
  }
};

const approveRequest = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const managerEmail = req.session.user.email;

  try {
    await knex.transaction(async (trx) => {
      const request = await accountRequestRepository.findById(id, trx);
      if (!request) {
        return;
      }

      if (request.status === 'approved') {
        return;
      }

      await accountRequestRepository.updateStatus(id, {
        status: 'approved',
        reviewedBy: managerEmail,
      }, trx);

      const existingUser = await trx('loginpermissions')
        .where({ email: request.email })
        .first();

      if (!existingUser) {
        await trx('loginpermissions').insert({
          email: request.email,
          password_hash: request.password_hash,
          first_name: request.first_name,
          last_name: request.last_name,
          permission: 'user',
        });
      }
    });
  } catch (error) {
    console.error('Error approving account request:', error);
  }

  return res.redirect('/admin/manager');
};

const rejectRequest = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const managerEmail = req.session.user.email;

  try {
    await accountRequestRepository.updateStatus(id, {
      status: 'rejected',
      reviewedBy: managerEmail,
    });
  } catch (error) {
    console.error('Error rejecting account request:', error);
  }

  return res.redirect('/admin/manager');
};

const elevateUser = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const returnQuery = (req.body && req.body.q) || '';
  const bodyRole = (req.body && req.body.role) || '';

  try {
    await authRepository.updateUserPermission(id, 'manager');
  } catch (error) {
    console.error('Error elevating user to manager:', error);
  }

  const queryParts = [];
  if (returnQuery) {
    queryParts.push(`q=${encodeURIComponent(returnQuery)}`);
  }
  if (bodyRole) {
    queryParts.push(`role=${encodeURIComponent(bodyRole)}`);
  }
  const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';
  const redirectUrl = `/admin/manager${queryString}#manager-section-users`;

  return res.redirect(redirectUrl);
};

const demoteUser = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const returnQuery = (req.body && req.body.q) || '';

  try {
    await authRepository.updateUserPermission(id, 'user');
  } catch (error) {
    console.error('Error demoting manager to user:', error);
  }

  const redirectUrl = returnQuery
    ? `/admin/manager?q=${encodeURIComponent(returnQuery)}#manager-section-users`
    : '/admin/manager#manager-section-users';

  return res.redirect(redirectUrl);
};

const deleteUser = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const currentUserId = req.session.user.id;
  const returnQuery = (req.body && req.body.q) || '';
  const bodyRole = (req.body && req.body.role) || '';
  const managerEmail = req.session.user.email;

  // Do not allow a manager to delete their own account from this screen
  if (Number(id) === Number(currentUserId)) {
    const redirectUrlSelf = returnQuery
      ? `/admin/manager?q=${encodeURIComponent(returnQuery)}`
      : '/admin/manager';
    return res.redirect(redirectUrlSelf);
  }

  try {
    await knex.transaction(async (trx) => {
      // Look up the user first so we have their email
      const user = await trx('loginpermissions').where({ id }).first();
      if (!user) {
        return;
      }

      await trx('loginpermissions').where({ id }).del();

      // If there was an account request for this email, mark it as rejected
      const matchingRequest = await accountRequestRepository.findByEmail(user.email, trx);
      if (matchingRequest) {
        await accountRequestRepository.markRejectedByEmail(user.email, managerEmail, trx);
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
  }

  const redirectUrl = returnQuery
    ? `/admin/manager?q=${encodeURIComponent(returnQuery)}#manager-section-users`
    : '/admin/manager#manager-section-users';

  return res.redirect(redirectUrl);
};

const editAccountRequest = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const { firstName, lastName, organization, message } = req.body;

  try {
    await knex.transaction(async (trx) => {
      // Find the account request first to get the email
      const request = await accountRequestRepository.findById(id, trx);
      if (!request) {
        return;
      }

      // Update account_requests
      await accountRequestRepository.updateById(id, {
        firstName,
        lastName,
        organization,
        message,
      }, trx);

      // Check if there's a matching user in loginpermissions and update if exists
      const existingUser = await trx('loginpermissions')
        .where({ email: request.email })
        .first();

      if (existingUser) {
        await authRepository.updateUserByEmail(request.email, {
          firstName,
          lastName,
        }, trx);
      }
    });
  } catch (error) {
    console.error('Error editing account request:', error);
  }

  return res.redirect('/admin/manager#manager-section-requests');
};

const editUser = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const { firstName, lastName } = req.body;
  const returnQuery = (req.body && req.body.q) || '';
  const bodyRole = (req.body && req.body.role) || '';

  try {
    await knex.transaction(async (trx) => {
      // Find the user first to get the email
      const user = await authRepository.findUserById(id, trx);
      if (!user) {
        return;
      }

      // Update loginpermissions
      await authRepository.updateUserById(id, {
        firstName,
        lastName,
      }, trx);

      // Check if there's a matching account request and update if exists
      const matchingRequest = await accountRequestRepository.findByEmail(user.email, trx);
      if (matchingRequest) {
        await trx('account_requests')
          .where({ email: user.email })
          .update({
            first_name: firstName,
            last_name: lastName,
          });
      }
    });
  } catch (error) {
    console.error('Error editing user:', error);
  }

  const queryParts = [];
  if (returnQuery) {
    queryParts.push(`q=${encodeURIComponent(returnQuery)}`);
  }
  if (bodyRole) {
    queryParts.push(`role=${encodeURIComponent(bodyRole)}`);
  }
  const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';
  return res.redirect(`/admin/manager${queryString}#manager-section-users`);
};

const deleteAccountRequest = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;

  try {
    await knex.transaction(async (trx) => {
      // Find the account request first to get the email
      const request = await accountRequestRepository.findById(id, trx);
      if (!request) {
        return;
      }

      // Delete from account_requests
      await accountRequestRepository.deleteById(id, trx);

      // Check if there's a matching user in loginpermissions and delete if exists
      const existingUser = await trx('loginpermissions')
        .where({ email: request.email })
        .first();

      if (existingUser) {
        await trx('loginpermissions').where({ email: request.email }).del();
      }
    });
  } catch (error) {
    console.error('Error deleting account request:', error);
  }

  return res.redirect('/admin/manager#manager-section-requests');
};

module.exports = {
  getManagerCorner,
  approveRequest,
  rejectRequest,
  elevateUser,
  demoteUser,
  deleteUser,
  editAccountRequest,
  editUser,
  deleteAccountRequest,
};
