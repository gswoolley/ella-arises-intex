const knex = require('../util/db');

const DEFAULT_PAGE_SIZE = 20;

function baseDonationQuery() {
  return knex('participantdonations as d')
    .leftJoin('participantinfo as p', 'd.participantid', 'p.participantid')
    .select(
      'd.donationid',
      'd.participantid',
      'd.donationdate',
      'd.donationamount',
      'p.participantfirstname as firstname',
      'p.participantlastname as lastname',
      'p.participantemail as email'
    );
}

function applySearch(query, search) {
  if (!search) return query;
  return query.where(function () {
    this.whereILike('p.participantfirstname', `%${search}%`)
      .orWhereILike('p.participantlastname', `%${search}%`)
      .orWhereILike('p.participantemail', `%${search}%`);
  });
}

function applyOrdering(query, orderBy) {
  const ordered = query.clone();
  switch (orderBy) {
    case 'date_asc':
      // Oldest dates first; donations without a date go last
      ordered
        .orderByRaw('d.donationdate IS NULL, d.donationdate ASC')
        .orderBy('d.donationid', 'asc');
      break;
    case 'amount_desc':
      ordered.orderBy('d.donationamount', 'desc').orderBy('d.donationdate', 'desc');
      break;
    case 'amount_asc':
      ordered.orderBy('d.donationamount', 'asc').orderBy('d.donationdate', 'desc');
      break;
    case 'date_desc':
    default:
      // Newest dates first; donations without a date go last
      ordered
        .orderByRaw('d.donationdate IS NULL, d.donationdate DESC')
        .orderBy('d.donationid', 'desc');
      break;
  }
  return ordered;
}

async function listDonations({ search = '', orderBy = 'date_desc', page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
  const base = applySearch(baseDonationQuery(), search);
  const ordered = applyOrdering(base, orderBy);

  const offset = (page - 1) * pageSize;
  const rows = await ordered.limit(pageSize).offset(offset);

  // Total count for pagination (respecting search, but ignoring ordering)
  const countQuery = applySearch(
    knex('participantdonations as d').leftJoin('participantinfo as p', 'd.participantid', 'p.participantid'),
    search
  ).count('* as count');

  const countResult = await countQuery.first();
  const totalCount = Number(countResult && countResult.count) || 0;

  return { rows, totalCount };
}

async function getMonthlyTotal() {
  const result = await knex.raw(
    `SELECT COALESCE(SUM(donationamount), 0) AS monthly_donations
     FROM participantdonations
     WHERE DATE_TRUNC('month', donationdate) = DATE_TRUNC('month', NOW())`
  );
  return Number(result.rows[0] && result.rows[0].monthly_donations) || 0;
}

async function getOverallTotal() {
  const result = await knex.raw(
    `SELECT COALESCE(SUM(donationamount), 0) AS overall_donations
     FROM participantdonations`
  );
  return Number(result.rows[0] && result.rows[0].overall_donations) || 0;
}

async function getDonationCount() {
  const result = await knex.raw(
    `SELECT COUNT(*)::int AS donation_count
     FROM participantdonations`
  );
  return Number(result.rows[0] && result.rows[0].donation_count) || 0;
}

async function findById(donationId) {
  if (!donationId) return null;
  return baseDonationQuery()
    .where('d.donationid', donationId)
    .first();
}

async function createDonation({ participantId, donationDate, donationAmount }) {
  if (!participantId || !donationDate || !donationAmount) return null;
  return knex('participantdonations').insert({
    participantid: participantId,
    donationdate: donationDate,
    donationamount: donationAmount,
  });
}

async function updateDonationById(donationId, { donationDate, donationAmount }) {
  if (!donationId) return null;
  return knex('participantdonations')
    .where({ donationid: donationId })
    .update({
      donationdate: donationDate,
      donationamount: donationAmount,
    });
}

async function deleteDonationById(donationId) {
  if (!donationId) return null;
  return knex('participantdonations').where({ donationid: donationId }).del();
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  listDonations,
  getMonthlyTotal,
  getOverallTotal,
  getDonationCount,
  findById,
  createDonation,
  updateDonationById,
  deleteDonationById,
};
