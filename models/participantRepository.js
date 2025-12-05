const knex = require('../util/db');

async function findByEmail(email) {
  if (!email) return null;
  return knex('personinfo')
    .where({ personemail: email })
    .first();
}

async function findById(personId) {
  if (!personId) return null;
  return knex('personinfo')
    .where({ personid: personId })
    .first();
}

async function getActiveParticipantsCount() {
  const result = await knex.raw(
    `SELECT COUNT(*)::int AS active_participants
     FROM personinfo`
  );

  return (
    (result.rows[0] && result.rows[0].active_participants) || 0
  );
}

// List all participants with optional search and pagination
async function listParticipants({ search = '', page = 1, limit = 25, orderBy = 'name_asc', surveyFilter = 'all' } = {}) {
  const offset = (page - 1) * limit;

  let query = knex('personinfo as p');
  
  // Apply survey filter
  if (surveyFilter === 'with_survey') {
    query = query
      .join('participantattendanceinstances as a', 'p.personid', 'a.personid')
      .join('surveyinstances as s', 'a.attendanceinstanceid', 's.attendanceinstanceid')
      .distinct('p.*');
  } else if (surveyFilter === 'without_survey') {
    query = query
      .leftJoin('participantattendanceinstances as a', 'p.personid', 'a.personid')
      .leftJoin('surveyinstances as s', 'a.attendanceinstanceid', 's.attendanceinstanceid')
      .whereNull('s.attendanceinstanceid')
      .distinct('p.*');
  } else {
    query = query.select('*');
  }

  if (search) {
    query = query.where(function () {
      this.whereILike('p.personemail', `%${search}%`)
        .orWhereILike('p.personfirstname', `%${search}%`)
        .orWhereILike('p.personlastname', `%${search}%`)
        .orWhereILike('p.personcity', `%${search}%`)
        .orWhereILike('p.personschooloremployer', `%${search}%`);
    });
  }

  // Apply ordering
  switch (orderBy) {
    case 'name_desc':
      query = query.orderBy('personfirstname', 'desc').orderBy('personlastname', 'desc');
      break;
    case 'email_asc':
      query = query.orderBy('personemail', 'asc');
      break;
    case 'email_desc':
      query = query.orderBy('personemail', 'desc');
      break;
    case 'city_asc':
      query = query.orderBy('personcity', 'asc');
      break;
    case 'city_desc':
      query = query.orderBy('personcity', 'desc');
      break;
    case 'name_asc':
    default:
      query = query.orderBy('personfirstname', 'asc').orderBy('personlastname', 'asc');
      break;
  }

  const participants = await query.clone().limit(limit).offset(offset);

  let countQuery = knex('personinfo as p');
  
  // Apply survey filter to count query
  if (surveyFilter === 'with_survey') {
    countQuery = countQuery
      .join('participantattendanceinstances as a', 'p.personid', 'a.personid')
      .join('surveyinstances as s', 'a.attendanceinstanceid', 's.attendanceinstanceid')
      .countDistinct('p.personid as count');
  } else if (surveyFilter === 'without_survey') {
    countQuery = countQuery
      .leftJoin('participantattendanceinstances as a', 'p.personid', 'a.personid')
      .leftJoin('surveyinstances as s', 'a.attendanceinstanceid', 's.attendanceinstanceid')
      .whereNull('s.attendanceinstanceid')
      .countDistinct('p.personid as count');
  } else {
    countQuery = countQuery.count('* as count');
  }
  
  if (search) {
    countQuery = countQuery.where(function () {
      this.whereILike('p.personemail', `%${search}%`)
        .orWhereILike('p.personfirstname', `%${search}%`)
        .orWhereILike('p.personlastname', `%${search}%`)
        .orWhereILike('p.personcity', `%${search}%`)
        .orWhereILike('p.personschooloremployer', `%${search}%`);
    });
  }
  const countResult = await countQuery.first();
  const total = Number(countResult?.count || 0);

  return { participants, total, page, limit };
}

// Get participant with all related data
async function getParticipantDetails(personId) {
  const participant = await findById(personId);
  if (!participant) return null;

  const [donations, milestones, attendance] = await Promise.all([
    knex('donations')
      .where({ personid: personId })
      .orderBy('donationdate', 'desc'),
    knex('participantmilestones')
      .where({ personid: personId })
      .orderBy('milestonedate', 'desc'),
    knex('participantattendanceinstances as a')
      .join('eventinstances as ei', 'a.instanceid', 'ei.instanceid')
      .join('eventtypes as et', 'ei.eventname', 'et.eventname')
      .leftJoin('surveyinstances as s', 'a.attendanceinstanceid', 's.attendanceinstanceid')
      .where('a.personid', personId)
      .select(
        'a.*',
        'ei.eventname',
        'ei.eventlocation',
        'ei.eventdatetimestart',
        'ei.eventdatetimeend',
        'et.eventtype',
        's.surveyoverallscore',
        's.surveynpsbucket',
        's.surveycomments'
      )
      .orderBy('ei.eventdatetimestart', 'desc'),
  ]);

  return { ...participant, donations, milestones, attendance };
}

// Update participant info
async function updateParticipant(personId, data) {
  return knex('personinfo')
    .where({ personid: personId })
    .update({
      personfirstname: data.firstName || null,
      personlastname: data.lastName || null,
      personemail: data.email || null,
      personphone: data.phone || null,
      persondob: data.dob || null,
      personrole: data.role || null,
      personcity: data.city || null,
      personstate: data.state || null,
      personzip: data.zip || null,
      personschooloremployer: data.schoolOrEmployer || null,
      personfieldofinterest: data.fieldOfInterest || null,
    });
}

// Add a new participant
async function addParticipant(data) {
  const [personId] = await knex('personinfo')
    .insert({
      personfirstname: data.firstName || null,
      personlastname: data.lastName || null,
      personemail: data.email || null,
      personphone: data.phone || null,
      persondob: data.dob || null,
      personrole: data.role || null,
      personcity: data.city || null,
      personstate: data.state || null,
      personzip: data.zip || null,
      personschooloremployer: data.schoolOrEmployer || null,
      personfieldofinterest: data.fieldOfInterest || null,
    })
    .returning('personid');
  
  return personId;
}

// Delete participant and all related data
async function deleteParticipant(personId) {
  return knex.transaction(async (trx) => {
    const attendanceIds = await trx('participantattendanceinstances')
      .where({ personid: personId })
      .pluck('attendanceinstanceid');

    if (attendanceIds.length > 0) {
      await trx('surveyinstances').whereIn('attendanceinstanceid', attendanceIds).del();
    }

    await trx('participantattendanceinstances').where({ personid: personId }).del();
    await trx('donations').where({ personid: personId }).del();
    await trx('participantmilestones').where({ personid: personId }).del();
    await trx('personinfo').where({ personid: personId }).del();
  });
}

// List recent surveys with participant and event info
async function listRecentSurveys({ search = '', page = 1, limit = 25, orderBy = 'date_desc' } = {}) {
  const offset = (page - 1) * limit;

  let query = knex('surveyinstances as s')
    .join('participantattendanceinstances as a', 's.attendanceinstanceid', 'a.attendanceinstanceid')
    .join('personinfo as p', 'a.personid', 'p.personid')
    .join('eventinstances as ei', 'a.instanceid', 'ei.instanceid')
    .select(
      's.*',
      'a.attendanceinstanceid',
      'p.personid',
      'p.personfirstname',
      'p.personlastname',
      'p.personemail',
      'ei.eventname',
      'ei.eventdatetimestart'
    );

  // Apply search filter
  if (search) {
    query = query.where(function () {
      this.whereILike('p.personfirstname', `%${search}%`)
        .orWhereILike('p.personlastname', `%${search}%`)
        .orWhereILike('p.personemail', `%${search}%`)
        .orWhereILike('ei.eventname', `%${search}%`);
    });
  }

  // Apply ordering
  switch (orderBy) {
    case 'date_asc':
      query = query.orderBy('s.surveysubmissiondate', 'asc');
      break;
    case 'score_desc':
      query = query.orderBy('s.surveyoverallscore', 'desc');
      break;
    case 'score_asc':
      query = query.orderBy('s.surveyoverallscore', 'asc');
      break;
    case 'participant_asc':
      query = query.orderBy('p.personfirstname', 'asc').orderBy('p.personlastname', 'asc');
      break;
    case 'participant_desc':
      query = query.orderBy('p.personfirstname', 'desc').orderBy('p.personlastname', 'desc');
      break;
    case 'date_desc':
    default:
      query = query.orderBy('s.surveysubmissiondate', 'desc');
      break;
  }

  const surveys = await query.clone().limit(limit).offset(offset);

  // Count with search filter
  let countQuery = knex('surveyinstances as s')
    .join('participantattendanceinstances as a', 's.attendanceinstanceid', 'a.attendanceinstanceid')
    .join('personinfo as p', 'a.personid', 'p.personid')
    .join('eventinstances as ei', 'a.instanceid', 'ei.instanceid');

  if (search) {
    countQuery = countQuery.where(function () {
      this.whereILike('p.personfirstname', `%${search}%`)
        .orWhereILike('p.personlastname', `%${search}%`)
        .orWhereILike('p.personemail', `%${search}%`)
        .orWhereILike('ei.eventname', `%${search}%`);
    });
  }

  const countResult = await countQuery.count('* as count').first();
  const total = Number(countResult?.count || 0);

  return { surveys, total, page, limit };
}

// List all milestones with participant info
async function listMilestones({ search = '', page = 1, limit = 25 } = {}) {
  const offset = (page - 1) * limit;

  let query = knex('participantmilestones as m')
    .join('personinfo as p', 'm.personid', 'p.personid')
    .select(
      'm.*',
      'p.personfirstname',
      'p.personlastname',
      'p.personemail'
    )
    .orderBy('m.milestonedate', 'desc');

  if (search) {
    query = query.where(function () {
      this.whereILike('m.milestonetitle', `%${search}%`)
        .orWhereILike('p.personfirstname', `%${search}%`)
        .orWhereILike('p.personlastname', `%${search}%`);
    });
  }

  const milestones = await query.clone().limit(limit).offset(offset);

  const countQuery = knex('participantmilestones as m')
    .join('personinfo as p', 'm.personid', 'p.personid');

  if (search) {
    countQuery.where(function () {
      this.whereILike('m.milestonetitle', `%${search}%`)
        .orWhereILike('p.personfirstname', `%${search}%`)
        .orWhereILike('p.personlastname', `%${search}%`);
    });
  }

  const countResult = await countQuery.count('* as count').first();
  const total = Number(countResult?.count || 0);

  return { milestones, total, page, limit };
}

// Add a milestone
async function addMilestone(personId, { title, date }) {
  return knex('participantmilestones').insert({
    personid: personId,
    milestonetitle: title,
    milestonedate: date || null,
  });
}

// Update a milestone
async function updateMilestone(milestoneId, { title, date }) {
  return knex('participantmilestones')
    .where({ participantmilestoneid: milestoneId })
    .update({
      milestonetitle: title,
      milestonedate: date || null,
    });
}

// Delete a milestone
async function deleteMilestone(milestoneId) {
  return knex('participantmilestones')
    .where({ participantmilestoneid: milestoneId })
    .del();
}

module.exports = {
  findByEmail,
  findById,
  getActiveParticipantsCount,
  listParticipants,
  getParticipantDetails,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  listRecentSurveys,
  listMilestones,
  addMilestone,
  updateMilestone,
  deleteMilestone,
};
