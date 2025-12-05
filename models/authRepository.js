// Authentication Repository - User login and permission management

const knex = require('../util/db');

// Find user by email
async function findUserByEmail(email) {
  if (!email) return null;
  return knex('loginpermissions').where({ email }).first();
}

// Delete user by ID
async function deleteUserById(id) {
  if (!id) return null;
  return knex('loginpermissions').where({ id }).del();
}

// Update user permission level
async function updateUserPermission(id, permission) {
  if (!id) return null;
  return knex('loginpermissions')
    .where({ id })
    .update({ permission });
}

// Find user by ID
async function findUserById(id, trx = null) {
  if (!id) return null;
  const runner = trx || knex;
  return runner('loginpermissions').where({ id }).first();
}

// Update user's name by ID
async function updateUserById(id, { firstName, lastName }, trx = null) {
  if (!id) return null;
  const runner = trx || knex;
  return runner('loginpermissions')
    .where({ id })
    .update({
      first_name: firstName,
      last_name: lastName,
    });
}

// Update user's name by email
async function updateUserByEmail(email, { firstName, lastName }, trx = null) {
  if (!email) return null;
  const runner = trx || knex;
  return runner('loginpermissions')
    .where({ email })
    .update({
      first_name: firstName,
      last_name: lastName,
    });
}

module.exports = {
  findUserByEmail,
  findUserById,
  deleteUserById,
  updateUserPermission,
  updateUserById,
  updateUserByEmail,
};
