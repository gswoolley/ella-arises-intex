const knex = require('../../../util/db');

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

    const requestsQuery = knex('account_requests')
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'organization',
        'status',
        'created_at',
        'reviewed_at',
        'reviewed_by',
        'message'
      );

    if (statusFilter === 'pending' || statusFilter === 'approved' || statusFilter === 'rejected') {
      requestsQuery.where({ status: statusFilter });
    }

    const [
      pendingRow,
      approvedThisMonthRow,
      totalAccountsRow,
      totalUsersRow,
      totalManagersRow,
      requests,
      usersPage,
      usersCountRow,
    ] = await Promise.all([
      knex('account_requests').where({ status: 'pending' }).count('* as count').first(),
      knex('account_requests')
        .where({ status: 'approved' })
        .andWhereRaw("DATE_TRUNC('month', reviewed_at) = DATE_TRUNC('month', NOW())")
        .count('* as count')
        .first(),
      knex('loginpermissions').count('* as count').first(),
      knex('loginpermissions').where({ permission: 'user' }).count('* as count').first(),
      knex('loginpermissions').where({ permission: 'manager' }).count('* as count').first(),
      requestsQuery.orderBy('created_at', 'desc'),
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
    ]);

    const metrics = {
      pending: Number(pendingRow?.count || 0),
      approvedThisMonth: Number(approvedThisMonthRow?.count || 0),
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
      const request = await trx('account_requests').where({ id }).first();
      if (!request) {
        return;
      }

      if (request.status === 'approved') {
        return;
      }

      await trx('account_requests')
        .where({ id })
        .update({
          status: 'approved',
          reviewed_at: trx.fn.now(),
          reviewed_by: managerEmail,
        });

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
    await knex('account_requests')
      .where({ id })
      .update({
        status: 'rejected',
        reviewed_at: knex.fn.now(),
        reviewed_by: managerEmail,
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

  try {
    await knex('loginpermissions')
      .where({ id })
      .update({
        permission: 'manager',
        updated_at: knex.fn.now(),
      });
  } catch (error) {
    console.error('Error elevating user to manager:', error);
  }

  const redirectUrl = returnQuery
    ? `/admin/manager?q=${encodeURIComponent(returnQuery)}`
    : '/admin/manager';

  return res.redirect(redirectUrl);
};

const demoteUser = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const returnQuery = (req.body && req.body.q) || '';

  try {
    await knex('loginpermissions')
      .where({ id })
      .update({
        permission: 'user',
        updated_at: knex.fn.now(),
      });
  } catch (error) {
    console.error('Error demoting manager to user:', error);
  }

  const redirectUrl = returnQuery
    ? `/admin/manager?q=${encodeURIComponent(returnQuery)}`
    : '/admin/manager';

  return res.redirect(redirectUrl);
};

const deleteUser = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const currentUserId = req.session.user.id;
  const returnQuery = (req.body && req.body.q) || '';
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
      const matchingRequest = await trx('account_requests').where({ email: user.email }).first();
      if (matchingRequest) {
        await trx('account_requests')
          .where({ email: user.email })
          .update({
            status: 'rejected',
            reviewed_at: trx.fn.now(),
            reviewed_by: managerEmail,
          });
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
  }

  const redirectUrl = returnQuery
    ? `/admin/manager?q=${encodeURIComponent(returnQuery)}`
    : '/admin/manager';

  return res.redirect(redirectUrl);
};

module.exports = {
  getManagerCorner,
  approveRequest,
  rejectRequest,
  elevateUser,
  demoteUser,
  deleteUser,
};
