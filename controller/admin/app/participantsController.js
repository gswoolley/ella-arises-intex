const participantRepository = require('../../../models/participantRepository');

const getParticipants = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  const isManager = req.session.user.permission === 'manager';
  const tab = req.query.tab || 'participants';
  const search = req.query.q || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  try {
    // Load data for ALL tabs at once to support tab switching without page reload
    const [participantsData, surveysData, milestonesData] = await Promise.all([
      participantRepository.listParticipants({ search: tab === 'participants' ? search : '', page: tab === 'participants' ? page : 1, limit: 25 }),
      participantRepository.listRecentSurveys({ page: tab === 'surveys' ? page : 1, limit: 25 }),
      participantRepository.listMilestones({ search: tab === 'milestones' ? search : '', page: tab === 'milestones' ? page : 1, limit: 25 }),
    ]);

    // Calculate total pages for the active tab
    let totalPages = 1;
    if (tab === 'participants') {
      totalPages = Math.ceil(participantsData.total / 25);
    } else if (tab === 'surveys') {
      totalPages = Math.ceil(surveysData.total / 25);
    } else if (tab === 'milestones') {
      totalPages = Math.ceil(milestonesData.total / 25);
    }

    return res.render('admin/app/participants', {
      user: req.session.user,
      isManager,
      tab,
      search,
      page,
      participants: participantsData.participants || [],
      surveys: surveysData.surveys || [],
      milestones: milestonesData.milestones || [],
      totalParticipants: participantsData.total || 0,
      totalSurveys: surveysData.total || 0,
      totalMilestones: milestonesData.total || 0,
      totalPages,
    });
  } catch (error) {
    console.error('Error loading participants view:', error);
    return res.status(500).render('admin/app/participants', {
      user: req.session.user,
      isManager,
      tab,
      search,
      page,
      participants: [],
      surveys: [],
      milestones: [],
      totalParticipants: 0,
      totalSurveys: 0,
      totalMilestones: 0,
      totalPages: 1,
      error: 'Unable to load data right now.',
    });
  }
};

const getParticipantDetails = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const details = await participantRepository.getParticipantDetails(id);
    if (!details) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    return res.json(details);
  } catch (error) {
    console.error('Error fetching participant details:', error);
    return res.status(500).json({ error: 'Failed to fetch participant details' });
  }
};

const updateParticipant = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    role,
    city,
    state,
    zip,
    schoolOrEmployer,
    fieldOfInterest,
  } = req.body;

  try {
    await participantRepository.updateParticipant(id, {
      firstName,
      lastName,
      email,
      phone,
      dob: dob || null,
      role,
      city,
      state,
      zip,
      schoolOrEmployer,
      fieldOfInterest,
    });
  } catch (error) {
    console.error('Error updating participant:', error);
  }

  const returnTab = req.body.tab || 'participants';
  const returnPage = req.body.page || 1;
  const returnSearch = req.body.q || '';

  let redirectUrl = `/admin/participants?tab=${returnTab}&page=${returnPage}`;
  if (returnSearch) {
    redirectUrl += `&q=${encodeURIComponent(returnSearch)}`;
  }

  return res.redirect(redirectUrl);
};

const deleteParticipant = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;

  try {
    await participantRepository.deleteParticipant(id);
  } catch (error) {
    console.error('Error deleting participant:', error);
  }

  const returnTab = req.body.tab || 'participants';
  const returnPage = req.body.page || 1;
  const returnSearch = req.body.q || '';

  let redirectUrl = `/admin/participants?tab=${returnTab}&page=${returnPage}`;
  if (returnSearch) {
    redirectUrl += `&q=${encodeURIComponent(returnSearch)}`;
  }

  return res.redirect(redirectUrl);
};

const addMilestone = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { participantId, title, date } = req.body;

  try {
    await participantRepository.addMilestone(participantId, { title, date: date || null });
  } catch (error) {
    console.error('Error adding milestone:', error);
  }

  const returnPage = req.body.page || 1;
  const returnSearch = req.body.q || '';

  let redirectUrl = `/admin/participants?tab=milestones&page=${returnPage}`;
  if (returnSearch) {
    redirectUrl += `&q=${encodeURIComponent(returnSearch)}`;
  }

  return res.redirect(redirectUrl);
};

const updateMilestone = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const { title, date } = req.body;

  try {
    await participantRepository.updateMilestone(id, { title, date: date || null });
  } catch (error) {
    console.error('Error updating milestone:', error);
  }

  const returnPage = req.body.page || 1;
  const returnSearch = req.body.q || '';

  let redirectUrl = `/admin/participants?tab=milestones&page=${returnPage}`;
  if (returnSearch) {
    redirectUrl += `&q=${encodeURIComponent(returnSearch)}`;
  }

  return res.redirect(redirectUrl);
};

const deleteMilestone = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;

  try {
    await participantRepository.deleteMilestone(id);
  } catch (error) {
    console.error('Error deleting milestone:', error);
  }

  const returnPage = req.body.page || 1;
  const returnSearch = req.body.q || '';

  let redirectUrl = `/admin/participants?tab=milestones&page=${returnPage}`;
  if (returnSearch) {
    redirectUrl += `&q=${encodeURIComponent(returnSearch)}`;
  }

  return res.redirect(redirectUrl);
};

const addParticipant = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    role,
    city,
    state,
    zip,
    schoolOrEmployer,
    fieldOfInterest,
  } = req.body;

  try {
    await participantRepository.addParticipant({
      firstName,
      lastName,
      email,
      phone,
      dob: dob || null,
      role,
      city,
      state,
      zip,
      schoolOrEmployer,
      fieldOfInterest,
    });
  } catch (error) {
    console.error('Error adding participant:', error);
  }

  const returnTab = req.body.tab || 'participants';
  const returnPage = req.body.page || 1;
  const returnSearch = req.body.q || '';

  let redirectUrl = `/admin/participants?tab=${returnTab}&page=${returnPage}`;
  if (returnSearch) {
    redirectUrl += `&q=${encodeURIComponent(returnSearch)}`;
  }

  return res.redirect(redirectUrl);
};

module.exports = {
  getParticipants,
  getParticipantDetails,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  addMilestone,
  updateMilestone,
  deleteMilestone,
};
