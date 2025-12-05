// Event Repository - Database operations for events
const knex = require('../util/db');

const DEFAULT_PAGE_SIZE = 20;

// Get count of upcoming events
async function getUpcomingEventsCount() {
  const result = await knex.raw(
    `SELECT COUNT(*)::int AS upcoming_events
     FROM eventinstances
     WHERE eventdatetimestart >= NOW()`
  );

  return (
    (result.rows[0] && result.rows[0].upcoming_events) || 0
  );
}

// Base query for events with participant count
function baseEventsQuery() {
  return knex('eventinstances').select(
    'eventinstances.instanceid',
    'eventinstances.eventname',
    'eventinstances.eventdatetimestart',
    'eventinstances.eventdatetimeend',
    'eventinstances.eventlocation',
    'eventinstances.eventcapacity',
    'eventinstances.eventregistrationdeadline',
    knex.raw(
      '(SELECT COUNT(*) FROM participantattendanceinstances pa WHERE pa.instanceid = eventinstances.instanceid) AS participant_count'
    )
  );
}

// Filter events by time (upcoming, past, or all)
function applyTimeFilter(query, timeFilter) {
  const q = query.clone();
  switch ((timeFilter || 'upcoming').toLowerCase()) {
    case 'past':
      q.where('eventdatetimestart', '<', knex.fn.now());
      break;
    case 'all':
      // no additional filter
      break;
    case 'upcoming':
    default:
      q.where('eventdatetimestart', '>=', knex.fn.now());
      break;
  }
  return q;
}

// Apply sorting to events query
function applyOrdering(query, orderBy) {
  const q = query.clone();
  switch (orderBy) {
    case 'name_asc':
      q.orderBy('eventname', 'asc');
      break;
    case 'name_desc':
      q.orderBy('eventname', 'desc');
      break;
    case 'participants_desc':
      q.orderBy('participant_count', 'desc').orderBy('eventdatetimestart', 'desc');
      break;
    case 'participants_asc':
      q.orderBy('participant_count', 'asc').orderBy('eventdatetimestart', 'desc');
      break;
    case 'date_asc':
      q.orderBy('eventdatetimestart', 'asc').orderBy('instanceid', 'asc');
      break;
    case 'date_desc':
    default:
      q.orderBy('eventdatetimestart', 'desc').orderBy('instanceid', 'desc');
      break;
  }
  return q;
}

// Get paginated list of events with filtering and sorting
async function listEvents({
  timeFilter = 'upcoming',
  orderBy = 'date_desc',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const base = baseEventsQuery();
  const filtered = applyTimeFilter(base, timeFilter);
  const ordered = applyOrdering(filtered, orderBy);

  const offset = (page - 1) * pageSize;
  const rows = await ordered.limit(pageSize).offset(offset);

  // Use a plain FROM eventinstances query for the count to avoid selecting
  // non-aggregated columns, which would require GROUP BY in Postgres.
  const countBase = knex('eventinstances');
  const countQuery = applyTimeFilter(countBase, timeFilter).count('* as count');
  const countRow = await countQuery.first();
  const totalCount = Number(countRow && countRow.count) || 0;

  return { rows, totalCount };
}

// Get all participants for a specific event
async function getEventParticipants(instanceId) {
  if (!instanceId) return [];

  return knex('participantattendanceinstances as a')
    .leftJoin('personinfo as p', 'a.personid', 'p.personid')
    .select(
      'a.attendanceinstanceid',
      'a.registrationstatus',
      'a.registrationattendedflag',
      'a.registrationcheckintime',
      'a.registrationcreateddate',
      'p.personid',
      'p.personfirstname',
      'p.personlastname',
      'p.personemail'
    )
    .where('a.instanceid', instanceId)
    .orderBy('a.registrationcreateddate', 'asc');
}

// Get all event templates (event types)
async function getAllEventTemplates() {
  return knex('eventtypes')
    .select('*')
    .orderBy('eventname', 'asc');
}

// Create a new event template
async function createEventTemplate(templateData) {
  const [template] = await knex('eventtypes')
    .insert({
      eventname: templateData.eventname,
      eventtype: templateData.eventtype || null,
      eventdescription: templateData.eventdescription || null,
      eventrecurrencepattern: templateData.eventrecurrencepattern || null,
      eventdefaultcapacity: templateData.eventdefaultcapacity || null,
    })
    .returning('*');
  return template;
}

// Create a new event instance
async function createEventInstance(instanceData) {
  const [instance] = await knex('eventinstances')
    .insert({
      eventname: instanceData.eventname,
      eventdatetimestart: instanceData.eventdatetimestart,
      eventdatetimeend: instanceData.eventdatetimeend || null,
      eventlocation: instanceData.eventlocation || null,
      eventcapacity: instanceData.eventcapacity || null,
      eventregistrationdeadline: instanceData.eventregistrationdeadline || null,
    })
    .returning('*');
  return instance;
}

// Get event template by ID
async function getEventTemplateById(eventtypeid) {
  return knex('eventtypes')
    .where({ eventtypeid })
    .first();
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  getUpcomingEventsCount,
  listEvents,
  getEventParticipants,
  getAllEventTemplates,
  createEventTemplate,
  createEventInstance,
  getEventTemplateById,
};
