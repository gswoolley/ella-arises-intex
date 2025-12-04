const knex = require('../util/db');

async function findByEmail(email) {
  if (!email) return null;
  return knex('participantinfo')
    .where({ participantemail: email })
    .first();
}

async function findById(participantId) {
  if (!participantId) return null;
  return knex('participantinfo')
    .where({ participantid: participantId })
    .first();
}

async function getActiveParticipantsCount() {
  const result = await knex.raw(
    `SELECT COUNT(*)::int AS active_participants
     FROM participantinfo`
  );

  return (
    (result.rows[0] && result.rows[0].active_participants) || 0
  );
}

module.exports = {
  findByEmail,
  findById,
  getActiveParticipantsCount,
};
