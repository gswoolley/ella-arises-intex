const knex = require('../../../util/db');

const PAGE_SIZE = 20;

const getDonations = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  const search = (req.query && req.query.q) || '';
  const orderBy = (req.query && req.query.orderBy) || 'date_desc';
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const editId = req.query && req.query.editId ? Number(req.query.editId) : null;

  try {
    const donationNotice = req.session && req.session.donationNotice;
    if (req.session && req.session.donationNotice) {
      delete req.session.donationNotice;
    }

    const baseQuery = knex('participantdonations as d')
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

    if (search) {
      baseQuery.where(function () {
        this.whereILike('p.participantfirstname', `%${search}%`)
          .orWhereILike('p.participantlastname', `%${search}%`)
          .orWhereILike('p.participantemail', `%${search}%`);
      });
    }

    const orderedQuery = baseQuery.clone();

    switch (orderBy) {
      case 'date_asc':
        // Oldest dates first; donations without a date go last
        orderedQuery
          .orderByRaw('d.donationdate IS NULL, d.donationdate ASC')
          .orderBy('d.donationid', 'asc');
        break;
      case 'amount_desc':
        orderedQuery.orderBy('d.donationamount', 'desc').orderBy('d.donationdate', 'desc');
        break;
      case 'amount_asc':
        orderedQuery.orderBy('d.donationamount', 'asc').orderBy('d.donationdate', 'desc');
        break;
      case 'date_desc':
      default:
        // Newest dates first; donations without a date go last
        orderedQuery
          .orderByRaw('d.donationdate IS NULL, d.donationdate DESC')
          .orderBy('d.donationid', 'desc');
        break;
    }

    const offset = (page - 1) * PAGE_SIZE;

    const [rows, monthlyAgg, overallAgg, countAgg] = await Promise.all([
      // Paged, filtered list (respects search/order)
      orderedQuery.clone().limit(PAGE_SIZE).offset(offset),

      // This month's donations (mirror home dashboard style)
      knex.raw(
        `SELECT COALESCE(SUM(donationamount), 0) AS monthly_donations
         FROM participantdonations
         WHERE DATE_TRUNC('month', donationdate) = DATE_TRUNC('month', NOW())`
      ),

      // All-time donations
      knex.raw(
        `SELECT COALESCE(SUM(donationamount), 0) AS overall_donations
         FROM participantdonations`
      ),

      // Total number of donation records
      knex.raw(
        `SELECT COUNT(*)::int AS donation_count
         FROM participantdonations`
      ),
    ]);

    let editDonation = null;
    if (editId) {
      editDonation = await knex('participantdonations as d')
        .leftJoin('participantinfo as p', 'd.participantid', 'p.participantid')
        .select(
          'd.donationid',
          'd.participantid',
          'd.donationdate',
          'd.donationamount',
          'p.participantfirstname as firstname',
          'p.participantlastname as lastname',
          'p.participantemail as email'
        )
        .where('d.donationid', editId)
        .first();
    }

    const monthlyTotal =
      (monthlyAgg.rows[0] && Number(monthlyAgg.rows[0].monthly_donations)) || 0;
    const overallTotal =
      (overallAgg.rows[0] && Number(overallAgg.rows[0].overall_donations)) || 0;
    const totalCount =
      (countAgg.rows[0] && Number(countAgg.rows[0].donation_count)) || 0;
    const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

    const metrics = {
      monthlyTotal,
      overallTotal,
      donationCount: totalCount,
    };

    const pendingDonation = req.session && req.session.pendingDonation;
    if (req.session && req.session.pendingDonation) {
      delete req.session.pendingDonation;
    }

    return res.render('admin/app/donations', {
      user: req.session.user,
      donations: rows,
      metrics,
      search,
      orderBy,
      page,
      totalPages,
      totalCount,
      editDonation,
      pendingDonation,
      donationNotice,
    });
  } catch (error) {
    console.error('Error loading donations:', error);
    return res.status(500).render('admin/app/donations', {
      user: req.session.user,
      donations: [],
      metrics: { monthlyTotal: 0, overallTotal: 0, donationCount: 0 },
      search,
      orderBy,
      page: 1,
      totalPages: 1,
      totalCount: 0,
      editDonation: null,
      pendingDonation: null,
      donationNotice: 'Unable to load donations right now.',
    });
  }
};

const prepareDonation = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { participantEmail, donationDate, donationAmount } = req.body;

  if (!participantEmail || !donationDate || !donationAmount) {
    return res.redirect('/admin/donations');
  }

  try {
    const participant = await knex('participantinfo')
      .where({ participantemail: participantEmail })
      .first();

    if (!participant) {
      if (req.session) {
        req.session.donationNotice = 'No participant found with that email. Please check the address and try again.';
      }
      return res.redirect('/admin/donations');
    }

    if (req.session) {
      req.session.pendingDonation = {
        participantId: participant.participantid,
        firstName: participant.participantfirstname,
        lastName: participant.participantlastname,
        email: participant.participantemail,
        donationDate,
        donationAmount,
      };
    }
  } catch (error) {
    console.error('Error preparing donation:', error);
  }

  return res.redirect('/admin/donations');
};

const createDonation = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const pending = req.session && req.session.pendingDonation;
  if (!pending) {
    return res.redirect('/admin/donations');
  }

  try {
    await knex('participantdonations').insert({
      participantid: pending.participantId,
      donationdate: pending.donationDate,
      donationamount: pending.donationAmount,
    });
  } catch (error) {
    console.error('Error creating donation:', error);
  }

  if (req.session) {
    delete req.session.pendingDonation;
  }

  return res.redirect('/admin/donations');
};

const updateDonation = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const { donationDate, donationAmount } = req.body;

  if (!donationDate || !donationAmount) {
    return res.redirect('/admin/donations');
  }

  try {
    await knex('participantdonations')
      .where({ donationid: id })
      .update({
        donationdate: donationDate,
        donationamount: donationAmount,
      });
  } catch (error) {
    console.error('Error updating donation:', error);
  }

  return res.redirect('/admin/donations');
};

const deleteDonation = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;

  try {
    await knex('participantdonations').where({ donationid: id }).del();
  } catch (error) {
    console.error('Error deleting donation:', error);
  }

  return res.redirect('/admin/donations');
};

module.exports = {
  getDonations,
  createDonation: {
    prepare: prepareDonation,
    create: createDonation,
  },
  updateDonation,
  deleteDonation,
};
