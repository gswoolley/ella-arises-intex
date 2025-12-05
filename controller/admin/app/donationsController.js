const donationRepository = require('../../../models/donationRepository');
const participantRepository = require('../../../models/participantRepository');

const getDonations = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  const search = (req.query && req.query.q) || '';
  const orderBy = (req.query && req.query.orderBy) || 'date_desc';
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  try {
    const donationNotice = req.session && req.session.donationNotice;
    if (req.session && req.session.donationNotice) {
      delete req.session.donationNotice;
    }

    const [{ rows, totalCount }, monthlyTotal, overallTotal, donationCount] = await Promise.all([
      donationRepository.listDonations({ search, orderBy, page, pageSize: donationRepository.DEFAULT_PAGE_SIZE }),
      donationRepository.getMonthlyTotal(),
      donationRepository.getOverallTotal(),
      donationRepository.getDonationCount(),
    ]);

    const totalPages = Math.max(
      Math.ceil(totalCount / donationRepository.DEFAULT_PAGE_SIZE),
      1
    );

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
    const participant = await participantRepository.findByEmail(participantEmail);

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
    await donationRepository.createDonation({
      participantId: pending.participantId,
      donationDate: pending.donationDate,
      donationAmount: pending.donationAmount,
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
    await donationRepository.updateDonationById(id, { donationDate, donationAmount });
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
    await donationRepository.deleteDonationById(id);
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
