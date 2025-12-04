const knex = require('../util/db');

async function findUserByEmail(email) {
  if (!email) return null;
  return knex('loginpermissions').where({ email }).first();
}

async function deleteUserById(id) {
  if (!id) return null;
  return knex('loginpermissions').where({ id }).del();
}

async function updateUserPermission(id, permission) {
  if (!id) return null;
  return knex('loginpermissions')
    .where({ id })
    .update({ permission });
}

async function findUserById(id, trx = null) {
  if (!id) return null;
  const runner = trx || knex;
  return runner('loginpermissions').where({ id }).first();
}

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
