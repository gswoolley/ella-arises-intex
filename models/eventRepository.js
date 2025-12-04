const knex = require('../util/db');

const DEFAULT_PAGE_SIZE = 20;

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

async function getEventParticipants(instanceId) {
  if (!instanceId) return [];

  return knex('participantattendanceinstances as a')
    .leftJoin('participantinfo as p', 'a.participantid', 'p.participantid')
    .select(
      'a.attendanceinstanceid',
      'a.registrationstatus',
      'a.registrationattendedflag',
      'a.registrationcheckintime',
      'a.registrationcreateddate',
      'p.participantid',
      'p.participantfirstname',
      'p.participantlastname',
      'p.participantemail'
    )
    .where('a.instanceid', instanceId)
    .orderBy('a.registrationcreateddate', 'asc');
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  getUpcomingEventsCount,
  listEvents,
  getEventParticipants,
};
