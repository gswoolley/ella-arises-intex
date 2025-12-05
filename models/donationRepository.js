// Donation Repository - Database operations for donations
const knex = require('../util/db');

const DEFAULT_PAGE_SIZE = 20;

// Base query that joins donations with person info
function baseDonationQuery() {
  return knex('donations as d')
    .leftJoin('personinfo as p', 'd.personid', 'p.personid')
    .select(
      'd.donationid',
      'd.personid',
      'd.donationdate',
      'd.donationamount',
      'd.donationno',
      'p.personfirstname as firstname',
      'p.personlastname as lastname',
      'p.personemail as email'
    );
}

// Apply search filter to query (searches name and email)
function applySearch(query, search) {
  if (!search) return query;
  return query.where(function () {
    this.whereILike('p.personfirstname', `%${search}%`)
      .orWhereILike('p.personlastname', `%${search}%`)
      .orWhereILike('p.personemail', `%${search}%`);
  });
}

// Apply sorting to query based on orderBy parameter
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

// Get paginated list of donations with search and sorting
async function listDonations({ search = '', orderBy = 'date_desc', page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
  const base = applySearch(baseDonationQuery(), search);
  const ordered = applyOrdering(base, orderBy);

  const offset = (page - 1) * pageSize;
  const rows = await ordered.limit(pageSize).offset(offset);

  // Total count for pagination (respecting search, but ignoring ordering)
  const countQuery = applySearch(
    knex('donations as d').leftJoin('personinfo as p', 'd.personid', 'p.personid'),
    search
  ).count('* as count');

  const countResult = await countQuery.first();
  const totalCount = Number(countResult && countResult.count) || 0;

  return { rows, totalCount };
}

// Get total donation amount for current month
async function getMonthlyTotal() {
  const result = await knex.raw(
    `SELECT COALESCE(SUM(donationamount), 0) AS monthly_donations
     FROM donations
     WHERE donationdate >= date_trunc('month', CURRENT_DATE)
       AND donationdate <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`
  );
  return Number(result.rows[0] && result.rows[0].monthly_donations) || 0;
}

// Get total donation amount across all time
async function getOverallTotal() {
  const result = await knex.raw(
    `SELECT COALESCE(SUM(donationamount), 0) AS overall_donations
     FROM donations`
  );
  return Number(result.rows[0] && result.rows[0].overall_donations) || 0;
}

// Get total count of all donations
async function getDonationCount() {
  const result = await knex.raw(
    `SELECT COUNT(*)::int AS donation_count
     FROM donations`
  );
  return Number(result.rows[0] && result.rows[0].donation_count) || 0;
}

// Find a single donation by ID
async function findById(donationId) {
  if (!donationId) return null;
  return baseDonationQuery()
    .where('d.donationid', donationId)
    .first();
}

// Create a new donation record
async function createDonation({ participantId, donationDate, donationAmount }) {
  if (!participantId || !donationDate || !donationAmount) return null;
  return knex('donations').insert({
    personid: participantId,
    donationdate: donationDate,
    donationamount: donationAmount,
    donationno: 0,
  });
}

// Update an existing donation
async function updateDonationById(donationId, { donationDate, donationAmount }) {
  if (!donationId) return null;
  return knex('donations')
    .where({ donationid: donationId })
    .update({
      donationdate: donationDate,
      donationamount: donationAmount,
    });
}

// Delete a donation by ID
async function deleteDonationById(donationId) {
  if (!donationId) return null;
  return knex('donations').where({ donationid: donationId }).del();
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
