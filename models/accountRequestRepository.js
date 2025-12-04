const knex = require('../util/db');

function baseRequestsQuery() {
  return knex('account_requests').select(
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
}

function listRequests({ statusFilter = 'all' }) {
  const query = baseRequestsQuery();

  if (statusFilter === 'pending' || statusFilter === 'approved' || statusFilter === 'rejected') {
    query.where({ status: statusFilter });
  }

  return query.orderBy('created_at', 'desc');
}

async function countPendingRequests() {
  const row = await knex('account_requests').where({ status: 'pending' }).count('* as count').first();
  return Number(row?.count || 0);
}

async function countApprovedThisMonth() {
  const row = await knex('account_requests')
    .where({ status: 'approved' })
    .andWhereRaw("DATE_TRUNC('month', reviewed_at) = DATE_TRUNC('month', NOW())")
    .count('* as count')
    .first();
  return Number(row?.count || 0);
}

async function findById(id, trx = null) {
  const q = (trx || knex)('account_requests').where({ id });
  return q.first();
}

async function findByEmail(email, trx = null) {
  const q = (trx || knex)('account_requests').where({ email });
  return q.first();
}

async function updateStatus(id, { status, reviewedBy }, trx = null) {
  const runner = trx || knex;
  return runner('account_requests')
    .where({ id })
    .update({
      status,
      reviewed_at: runner.fn.now(),
      reviewed_by: reviewedBy,
    });
}

async function markRejectedByEmail(email, reviewedBy, trx = null) {
  const runner = trx || knex;
  return runner('account_requests')
    .where({ email })
    .update({
      status: 'rejected',
      reviewed_at: runner.fn.now(),
      reviewed_by: reviewedBy,
    });
}

module.exports = {
  listRequests,
  countPendingRequests,
  countApprovedThisMonth,
  findById,
  findByEmail,
  updateStatus,
  markRejectedByEmail,
};
