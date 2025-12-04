const knex = require('../util/db');

async function getAvgSatisfactionLast100Days() {
  const result = await knex.raw(
    `SELECT ROUND(AVG(surveyoverallscore), 2) AS avg_satisfaction
     FROM surveyinstances
     WHERE surveysubmissiondate >= NOW() - INTERVAL '100 days'`
  );

  return (
    (result.rows[0] && Number(result.rows[0].avg_satisfaction)) || 0
  );
}

module.exports = {
  getAvgSatisfactionLast100Days,
};
