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

module.exports = {
  findUserByEmail,
  deleteUserById,
  updateUserPermission,
};
