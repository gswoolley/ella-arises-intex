const eventRepository = require('../../../models/eventRepository');

const getEvents = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  const timeFilter = (req.query && req.query.timeFilter) || 'upcoming';
  const orderBy = (req.query && req.query.orderBy) || 'date_desc';
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const viewParticipantsId = req.query && req.query.viewParticipantsId
    ? Number(req.query.viewParticipantsId)
    : null;
  const editId = req.query && req.query.editId ? Number(req.query.editId) : null;

  try {
    const [{ rows, totalCount }] = await Promise.all([
      eventRepository.listEvents({ timeFilter, orderBy, page, pageSize: eventRepository.DEFAULT_PAGE_SIZE }),
    ]);

    const totalPages = Math.max(
      Math.ceil(totalCount / eventRepository.DEFAULT_PAGE_SIZE),
      1
    );

    let participants = [];
    if (viewParticipantsId) {
      participants = await eventRepository.getEventParticipants(viewParticipantsId);
    }

    let editEvent = null;
    if (editId) {
      editEvent = rows.find((e) => e.instanceid === editId) || null;
    }

    return res.render('admin/app/events', {
      user: req.session.user,
      events: rows,
      timeFilter,
      orderBy,
      page,
      totalPages,
      totalCount,
      viewParticipantsId,
      participants,
      editEvent,
    });
  } catch (error) {
    console.error('Error loading events:', error);
    return res.status(500).render('admin/app/events', {
      user: req.session.user,
      events: [],
      timeFilter,
      orderBy,
      page: 1,
      totalPages: 1,
      totalCount: 0,
      viewParticipantsId: null,
      participants: [],
      editEvent: null,
      error: 'Unable to load events right now.',
    });
  }
};

const updateEvent = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const {
    eventname,
    eventdatetimestart,
    eventdatetimeend,
    eventlocation,
    eventcapacity,
    eventregistrationdeadline,
  } = req.body;

  try {
    await require('../../../util/db')('eventinstances')
      .where({ instanceid: id })
      .update({
        eventname,
        eventdatetimestart,
        eventdatetimeend,
        eventlocation,
        eventcapacity,
        eventregistrationdeadline,
      });
  } catch (error) {
    console.error('Error updating event:', error);
  }

  return res.redirect('/admin/events');
};

const deleteEvent = async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.permission !== 'manager') {
    return res.redirect('/admin/home');
  }

  const { id } = req.params;
  const knex = require('../../../util/db');

  try {
    await knex.transaction(async (trx) => {
      await trx('participantattendanceinstances').where({ instanceid: id }).del();
      await trx('eventinstances').where({ instanceid: id }).del();
    });
  } catch (error) {
    console.error('Error deleting event:', error);
  }

  return res.redirect('/admin/events');
};

module.exports = {
  getEvents,
  updateEvent,
  deleteEvent,
};
