// Account Request Repository - Manage user access requests

const knex = require('../util/db');

// Base query for account requests
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

// List account requests with optional status filter
function listRequests({ statusFilter = 'all' }) {
  const query = baseRequestsQuery();

  if (statusFilter === 'pending' || statusFilter === 'approved' || statusFilter === 'rejected') {
    query.where({ status: statusFilter });
  }

  return query.orderBy('created_at', 'desc');
}

// Count pending requests
async function countPendingRequests() {
  const row = await knex('account_requests').where({ status: 'pending' }).count('* as count').first();
  return Number(row?.count || 0);
}

// Count requests approved this month
async function countApprovedThisMonth() {
  const row = await knex('account_requests')
    .where({ status: 'approved' })
    .andWhereRaw("DATE_TRUNC('month', reviewed_at) = DATE_TRUNC('month', NOW())")
    .count('* as count')
    .first();
  return Number(row?.count || 0);
}

// Find request by ID
async function findById(id, trx = null) {
  const q = (trx || knex)('account_requests').where({ id });
  return q.first();
}

// Find request by email
async function findByEmail(email, trx = null) {
  const q = (trx || knex)('account_requests').where({ email });
  return q.first();
}

// Update request status (approve/reject)
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

// Mark request as rejected by email
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

// Delete request by ID
async function deleteById(id, trx = null) {
  const runner = trx || knex;
  return runner('account_requests').where({ id }).del();
}

// Update request details
async function updateById(id, { firstName, lastName, organization, message }, trx = null) {
  const runner = trx || knex;
  return runner('account_requests')
    .where({ id })
    .update({
      first_name: firstName,
      last_name: lastName,
      organization: organization || null,
      message: message || null,
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
  deleteById,
  updateById,
};
