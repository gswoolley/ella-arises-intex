const { DateTime } = require('luxon');

// Treat undefined, null, or all-whitespace strings as a canonical null
// value so downstream logic can simply check for falsy/non-null.
function toNullIfBlank(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

// Parse a datetime that may be in the explicit 'yyyy-MM-dd HH:mm:ss' format or
// a more general ISO string. Returns a JS Date or null if parsing fails.
function parseDate(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  
  let dt = DateTime.fromFormat(v, 'yyyy-MM-dd HH:mm:ss', { zone: 'utc' });
  if (dt.isValid) return dt.toJSDate();
  
  // Try M/d/yy H:mm format (e.g., "10/6/24 10:00")
  dt = DateTime.fromFormat(v, 'M/d/yy H:mm', { zone: 'utc' });
  if (dt.isValid) {
    // If the year is before 1950, assume it's 2000s
    if (dt.year < 1950) {
      dt = dt.plus({ years: 100 });
    }
    return dt.toJSDate();
  }
  
  const dt2 = DateTime.fromISO(v, { zone: 'utc' });
  return dt2.isValid ? dt2.toJSDate() : null;
}

// Parse a value that should conceptually be a date (optionally with a
// time component). We try multiple formats and fall back to ISO parsing.
function parseDateOnly(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  // First try a plain date (YYYY-MM-DD)
  let dt = DateTime.fromFormat(v, 'yyyy-MM-dd', { zone: 'utc' });
  if (dt.isValid) return dt.toJSDate();

  // Try M/D/YY format (e.g., "5/2/25")
  dt = DateTime.fromFormat(v, 'M/d/yy', { zone: 'utc' });
  if (dt.isValid) {
    // If the year is before 1950, assume it's 2000s
    if (dt.year < 1950) {
      dt = dt.plus({ years: 100 });
    }
    return dt.toJSDate();
  }

  // Then try a full datetime as described in creation_process.txt (YYYY-MM-DD HH:MM:SS)
  dt = DateTime.fromFormat(v, 'yyyy-MM-dd HH:mm:ss', { zone: 'utc' });
  if (dt.isValid) return dt.toJSDate();

  // Try M/D/YY H:mm format with time
  dt = DateTime.fromFormat(v, 'M/d/yy H:mm', { zone: 'utc' });
  if (dt.isValid) {
    // If the year is before 1950, assume it's 2000s
    if (dt.year < 1950) {
      dt = dt.plus({ years: 100 });
    }
    return dt.toJSDate();
  }

  // Finally, fall back to generic ISO parsing
  const dt2 = DateTime.fromISO(v, { zone: 'utc' });
  return dt2.isValid ? dt2.toJSDate() : null;
}

// For TIMESTAMP WITHOUT TIME ZONE columns we want to preserve the literal
// wall-clock time from the CSV (e.g., "2024-10-06 10:00:00") without any
// timezone shifts. This helper normalizes the string format but still returns
// a string, so Postgres parses it directly as-is.
// Normalize dates/times into a canonical 'yyyy-MM-dd HH:mm:ss' string without
// applying time zone conversions. Postgres will parse this as-is.
function toTimestampLiteral(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;

  // Try to parse common formats and then reformat to a canonical
  // 'yyyy-MM-dd HH:mm:ss' string. If parsing fails, return the original
  // trimmed value so Postgres can attempt to interpret it.
  let dt = DateTime.fromFormat(v, 'yyyy-MM-dd HH:mm:ss');
  if (dt.isValid) return dt.toFormat('yyyy-MM-dd HH:mm:ss');

  // Try M/D/YY H:mm format (e.g., "10/6/24 10:00" or "9/18/25 10:00")
  // Note: 'yy' in Luxon assumes 1900s for values >= 69, 2000s for < 69
  // So we need to handle this manually for years like '25' (should be 2025)
  dt = DateTime.fromFormat(v, 'M/d/yy H:mm');
  if (dt.isValid) {
    // If the year is before 1950, assume it's 2000s
    if (dt.year < 1950) {
      dt = dt.plus({ years: 100 });
    }
    return dt.toFormat('yyyy-MM-dd HH:mm:ss');
  }

  dt = DateTime.fromISO(v);
  if (dt.isValid) return dt.toFormat('yyyy-MM-dd HH:mm:ss');

  return v;
}

// Safe integer parsing that returns null on invalid or blank input.
function parseIntOrNull(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// Safe float parsing that returns null on invalid or blank input.
function parseFloatOrNull(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

// Normalize a variety of truthy/falsey tokens into booleans or null.
function parseBoolean(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  const lower = v.toLowerCase();
  if (['true', '1', 'yes'].includes(lower)) return true;
  if (['false', '0', 'no'].includes(lower)) return false;
  return null;
}

// Normalize NPS bucket labels (promoter/passive/detractor) into a fixed
// capitalized set used by the reporting schema.
function normalizeNpsBucket(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower === 'promoter') return 'Promoter';
  if (lower === 'passive') return 'Passive';
  if (lower === 'detractor') return 'Detractor';
  return null;
}

// Strip all non-digits from phone numbers and treat empty results as null.
function normalizePhone(value) {
  const v = toNullIfBlank(value);
  if (!v) return null;
  const digits = v.replace(/\D/g, '');
  return digits === '' ? null : digits;
}

// Record rows that are dropped or partially processed into the
// normalization_audit table for traceability.
async function auditDrop(knex, row, reason) {
  if (!row || !row.rowid) return;

  try {
    await knex('normalization_audit').insert({
      rowid: row.rowid,
      reason,
      participantemail: row.participantemail,
      participantfirstname: row.participantfirstname,
      participantlastname: row.participantlastname,
      participantdob: row.participantdob,
      participantrole: row.participantrole,
      participantphone: row.participantphone,
      participantcity: row.participantcity,
      participantstate: row.participantstate,
      participantzip: row.participantzip,
      participantschooloremployer: row.participantschooloremployer,
      participantfieldofinterest: row.participantfieldofinterest,
    });
    console.log('[normalize][audit] Logged dropped/partial row', { rowid: row.rowid, reason });
  } catch (auditErr) {
    console.error('[normalize][audit] Failed to insert normalization_audit row', { rowid: row.rowid, reason, error: auditErr });
  }
}

// Ensure there is exactly one personinfo record per email.
// Returns the personid primary key.
async function getOrCreateParticipant(knex, row) {
  const email = toNullIfBlank(row.participantemail);
  if (!email) return null;

  const existing = await knex('personinfo')
    .where({ personemail: email })
    .first();

  const base = {
    personemail: email,
    personfirstname: toNullIfBlank(row.participantfirstname),
    personlastname: toNullIfBlank(row.participantlastname),
    persondob: parseDateOnly(row.participantdob),
    personrole: toNullIfBlank(row.participantrole),
    personphone: normalizePhone(row.participantphone),
    personcity: toNullIfBlank(row.participantcity),
    personstate: toNullIfBlank(row.participantstate),
    personzip: toNullIfBlank(row.participantzip),
    personschooloremployer: toNullIfBlank(row.participantschooloremployer),
    personfieldofinterest: toNullIfBlank(row.participantfieldofinterest),
  };

  if (existing) {
    console.log('[participant] Reusing existing participant', { email, personId: existing.personid });
    // Still add to staging table even if participant exists
    await knex('staging_personinfo').insert({ ...base, personid: existing.personid });
    return existing.personid;
  }

  const [inserted] = await knex('personinfo')
    .insert(base)
    .returning('personid');

  const personId = inserted.personid ?? inserted;
  console.log('[participant] Inserted new participant', { email, personId });
  
  // Also insert into staging table
  await knex('staging_personinfo').insert({ ...base, personid: personId });
  
  return personId;
}

// Ensure the eventtypes table has a row for the given event name, inserting
// if necessary. Uses eventname as a natural key.
async function getOrCreateEventType(knex, row) {
  const eventName = toNullIfBlank(row.eventname);
  if (!eventName) return null;

  const existing = await knex('eventtypes')
    .where({ eventname: eventName })
    .first();

  const eventData = {
    eventname: eventName,
    eventtype: toNullIfBlank(row.eventtype),
    eventdescription: toNullIfBlank(row.eventdescription),
    eventrecourrancepatter: toNullIfBlank(row.eventrecurrencepattern),
    eventdefaultcapacity: parseIntOrNull(row.eventdefaultcapacity),
  };

  if (existing) {
    console.log('[eventtype] Reusing existing event type', { eventName });
    // Still add to staging table
    await knex('staging_eventtypes').insert(eventData);
    return eventName;
  }

  await knex('eventtypes').insert(eventData);
  console.log('[eventtype] Inserted new event type', { eventName });
  
  // Also insert into staging table
  await knex('staging_eventtypes').insert(eventData);
  
  return eventName;
}

// Ensure there is a single event instance for a given (eventname, start).
// Returns instanceid from eventinstances.
async function getOrCreateEventInstance(knex, row) {
  const eventName = toNullIfBlank(row.eventname);
  // Use a canonical timestamp literal for both lookup and insert so that
  // repeated runs with the same CSV values always hit the same instance.
  const startLiteral = toTimestampLiteral(row.eventdatetimestart);
  if (!eventName || !startLiteral) return null;

  const existing = await knex('eventinstances')
    .where({ eventname: eventName, eventdatetimestart: startLiteral })
    .first();

  const instanceData = {
    eventname: eventName,
    eventdatetimestart: startLiteral,
    eventdatetimeend: toTimestampLiteral(row.eventdatetimeend),
    eventlocation: toNullIfBlank(row.eventlocation),
    eventcapacity: parseIntOrNull(row.eventcapacity),
    eventregistrationdeadline: toTimestampLiteral(row.eventregistrationdeadline),
  };

  if (existing) {
    console.log('[eventinstance] Reusing existing event instance', { eventName, eventStart: startLiteral, instanceId: existing.instanceid });
    // Still add to staging table
    await knex('staging_eventinstances').insert({ ...instanceData, instanceid: existing.instanceid });
    return existing.instanceid;
  }

  const [inserted] = await knex('eventinstances')
    .insert(instanceData)
    .returning('instanceid');

  const instanceId = inserted.instanceid ?? inserted;
  console.log('[eventinstance] Inserted new event instance', { eventName, eventStart: startLiteral, instanceId });
  
  // Also insert into staging table
  await knex('staging_eventinstances').insert({ ...instanceData, instanceid: instanceId });
  
  return instanceId;
}

// Ensure there is a single attendance record tying a participant to an
// event instance. Returns attendanceinstanceid.
async function getOrCreateAttendance(knex, participantId, instanceId, row) {
  if (!participantId || !instanceId) return null;

  const existing = await knex('participantattendanceinstances')
    .where({ personid: participantId, instanceid: instanceId })
    .first();

  const attendanceData = {
    personid: participantId,
    instanceid: instanceId,
    eventdatetimestart: toTimestampLiteral(row.eventdatetimestart),
    registrationstatus: toNullIfBlank(row.registrationstatus),
    registrationattendedflag: parseBoolean(row.registrationattendedflag),
    registrationcheckintime: toTimestampLiteral(row.registrationcheckintime),
    registrationcreateddate: toTimestampLiteral(row.registrationcreatedat),
  };

  if (existing) {
    console.log('[attendance] Reusing existing attendance', { participantId, instanceId, attendanceId: existing.attendanceinstanceid });
    // Still add to staging table
    await knex('staging_participantattendanceinstances').insert({ ...attendanceData, attendanceinstanceid: existing.attendanceinstanceid });
    return existing.attendanceinstanceid;
  }

  const [inserted] = await knex('participantattendanceinstances')
    .insert(attendanceData)
    .returning('attendanceinstanceid');

  const attendanceId = inserted.attendanceinstanceid ?? inserted;
  console.log('[attendance] Inserted new attendance', { participantId, instanceId, attendanceId });
  
  // Also insert into staging table
  await knex('staging_participantattendanceinstances').insert({ ...attendanceData, attendanceinstanceid: attendanceId });
  
  return attendanceId;
}

// Conditionally create a surveyinstances record associated with a given
// attendanceinstance if any survey fields are present.
async function createSurveyIfNeeded(knex, attendanceId, row) {
  if (!attendanceId) return;

  const fields = [
    row.surveysatisfactionscore,
    row.surveyusefulnesscore,
    row.surveyinstructorscore,
    row.surveyrecommendationscore,
    row.surveyoverallscore,
    row.surveynpsbucket,
    row.surveycomments,
    row.surveysubmissiondate,
  ];

  const hasNonEmpty = fields.some((f) => toNullIfBlank(f) !== null);
  if (!hasNonEmpty) {
    console.log('[survey] No survey fields present, skipping survey for attendance', { attendanceId });
    return;
  }

  const existing = await knex('surveyinstances')
    .where({ attendanceinstanceid: attendanceId })
    .first();

  const surveyData = {
    attendanceinstanceid: attendanceId,
    surveysatisfactionscore: parseFloatOrNull(row.surveysatisfactionscore),
    surveyusefulnesscore: parseFloatOrNull(row.surveyusefulnesscore),
    surveyinstructorscore: parseFloatOrNull(row.surveyinstructorscore),
    surveyrecommendationscore: parseFloatOrNull(row.surveyrecommendationscore),
    surveyoverallscore: parseFloatOrNull(row.surveyoverallscore),
    surveynpsbucket: normalizeNpsBucket(row.surveynpsbucket),
    surveycomments: toNullIfBlank(row.surveycomments),
    surveysubmissiondate: toTimestampLiteral(row.surveysubmissiondate),
  };

  if (existing) {
    console.log('[survey] Survey already exists for attendance, skipping insert', { attendanceId });
    // Still add to staging table
    await knex('staging_surveyinstances').insert(surveyData);
    return;
  }

  await knex('surveyinstances').insert(surveyData);
  console.log('[survey] Inserted survey for attendance', { attendanceId });
  
  // Also insert into staging table
  await knex('staging_surveyinstances').insert(surveyData);
}

// Parse semi-colon separated milestone titles/dates and insert them into
// participantmilestones for a participant, avoiding duplicates. Also
// recomputes the milestoneno sequence.
async function createMilestonesIfNeeded(knex, participantId, row) {
  if (!participantId) return;

  const titlesRaw = toNullIfBlank(row.milestonetitles);
  const datesRaw = toNullIfBlank(row.milestonedates);

  if (!titlesRaw && !datesRaw) {
    console.log('[milestones] No milestone data, skipping for participant', { participantId });
    return;
  }

  const titles = titlesRaw ? titlesRaw.split(';').map((t) => t.trim()) : [];
  const dates = datesRaw ? datesRaw.split(';').map((d) => d.trim()) : [];
  const maxLen = Math.max(titles.length, dates.length);

  for (let i = 0; i < maxLen; i += 1) {
    const title = titles[i] || null;
    const date = dates[i] ? parseDateOnly(dates[i]) : null;

    if (!title && !date) continue;

    // Check for existing milestone with same natural key
    // eslint-disable-next-line no-await-in-loop
    const existing = await knex('participantmilestones')
      .where({
        personid: participantId,
        milestonetitle: title || null,
        milestonedate: date || null,
      })
      .first();

    const milestoneData = {
      personid: participantId,
      milestonetitle: title,
      milestonedate: date,
    };

    if (existing) {
      console.log('[milestones] Skipping duplicate milestone', { participantId, title, date });
      // Still add to staging table with existing ID
      // eslint-disable-next-line no-await-in-loop
      await knex('staging_participantmilestones').insert({ ...milestoneData, participantmilestoneid: existing.participantmilestoneid, milestoneno: 0 });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const [inserted] = await knex('participantmilestones').insert(milestoneData).returning('participantmilestoneid');
    const milestoneId = inserted.participantmilestoneid ?? inserted;
    console.log('[milestones] Inserted milestone', { participantId, title, date, milestoneId });
    
    // Also insert into staging table
    // eslint-disable-next-line no-await-in-loop
    await knex('staging_participantmilestones').insert({ ...milestoneData, participantmilestoneid: milestoneId, milestoneno: 0 });
  }

  // Recompute milestoneno ordering for this participant
  const milestones = await knex('participantmilestones')
    .where({ personid: participantId })
    .orderBy([{ column: 'milestonedate', order: 'asc' }, { column: 'participantmilestoneid', order: 'asc' }]);

  for (let i = 0; i < milestones.length; i += 1) {
    const m = milestones[i];
    // eslint-disable-next-line no-await-in-loop
    await knex('participantmilestones')
      .where({ participantmilestoneid: m.participantmilestoneid })
      .update({ milestoneno: i + 1 });
    // Also update in staging table if it exists
    // eslint-disable-next-line no-await-in-loop
    await knex('staging_participantmilestones')
      .where({ participantmilestoneid: m.participantmilestoneid })
      .update({ milestoneno: i + 1 });
  }
  console.log('[milestones] Recomputed milestoneno for participant', { participantId, count: milestones.length });
}

// Parse a semi-colon separated donation history string into individual
// donation records for participantdonations, and recompute donationno.
async function createDonationsIfNeeded(knex, participantId, row) {
  if (!participantId) return;

  const historyRaw = toNullIfBlank(row.donationhistory);
  if (!historyRaw) {
    console.log('[donations] No donation history, skipping for participant', { participantId });
    return;
  }

  const entries = historyRaw
    .split(';')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  for (const entry of entries) {
    const [datePart, amountPart] = entry.split(':');
    const donationDate = parseDateOnly(datePart);
    const amountString = amountPart ? amountPart.replace(/[^0-9.\-]/g, '') : null;
    const donationAmount = amountString ? parseFloatOrNull(amountString) : null;

    if (!donationDate && donationAmount === null) {
      // eslint-disable-next-line no-continue
      console.log('[donations] Entry could not be parsed, skipping', { participantId, entry });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const existing = await knex('donations')
      .where({
        personid: participantId,
        donationdate: donationDate,
        donationamount: donationAmount,
      })
      .first();

    const donationData = {
      personid: participantId,
      donationdate: donationDate,
      donationamount: donationAmount,
      donationno: 0,
    };

    if (existing) {
      // eslint-disable-next-line no-continue
      console.log('[donations] Skipping duplicate donation', { participantId, donationDate, donationAmount });
      // Still add to staging table with existing ID
      // eslint-disable-next-line no-await-in-loop
      await knex('staging_donations').insert({ ...donationData, donationid: existing.donationid });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const [inserted] = await knex('donations').insert(donationData).returning('donationid');
    const donationId = inserted.donationid ?? inserted;
    console.log('[donations] Inserted donation', { participantId, donationDate, donationAmount, donationId });
    
    // Also insert into staging table
    // eslint-disable-next-line no-await-in-loop
    await knex('staging_donations').insert({ ...donationData, donationid: donationId });
  }

  // Recompute donationno for this participant
  const donations = await knex('donations')
    .where({ personid: participantId })
    .orderBy([{ column: 'donationdate', order: 'asc' }, { column: 'donationid', order: 'asc' }]);

  for (let i = 0; i < donations.length; i += 1) {
    const d = donations[i];
    // eslint-disable-next-line no-await-in-loop
    await knex('donations')
      .where({ donationid: d.donationid })
      .update({ donationno: i + 1 });
    // Also update in staging table if it exists
    // eslint-disable-next-line no-await-in-loop
    await knex('staging_donations')
      .where({ donationid: d.donationid })
      .update({ donationno: i + 1 });
  }
  console.log('[donations] Recomputed donationno for participant', { participantId, count: donations.length });
}

// Top-level normalization entrypoint. This function is invoked after a CSV
// load to stagingrawsurvey and is responsible for populating all normalized
// tables, writing audit records, archiving the staging rows, and then
// truncating staging so the next run starts fresh.
async function runNormalization(knex) {
  console.log('--- Normalization run started ---');

  // Clear any previous audit entries so each upload run has a fresh audit set
  try {
    console.log('[normalize] Truncating normalization_audit (start of run)');
    await knex('normalization_audit').truncate();
  } catch (err) {
    console.error('[normalize] Failed to truncate normalization_audit', err);
  }

  // Load all rows from the raw staging table. Each row represents a single
  // logical survey/attendance/milestone/donation record from the CSV.
  const rows = await knex('stagingrawsurvey').select('*');
  console.log('[normalize] Loaded rows from stagingrawsurvey', { rowCount: rows.length });

  let processedCount = 0;
  let skippedNoEmail = 0;

  // Process each staging row independently. Many of the helper functions
  // below will de-duplicate entities (participants, events, etc.).
  for (const row of rows) {
    const hasParticipantEmail = toNullIfBlank(row.participantemail);
    if (!hasParticipantEmail) {
      // Skip full normalization for this row. Before skipping, write an
      // audit record so we know why it was dropped.
      // eslint-disable-next-line no-await-in-loop
      await auditDrop(knex, row, 'missing participantemail');

      // eslint-disable-next-line no-continue
      skippedNoEmail += 1;
      console.log('[normalize] Skipping row with missing participantemail', { rowid: row.rowid });
      continue;
    }

    // Participant normalization: upsert into participantinfo based on email.
    // eslint-disable-next-line no-await-in-loop
    const participantId = await getOrCreateParticipant(knex, row);

    // Event-related normalization only if eventname and eventdatetimestart
    // are present. Otherwise, we skip event/attendance/survey and log why.
    const eventName = toNullIfBlank(row.eventname);
    const eventStart = parseDate(row.eventdatetimestart);

    let instanceId = null;
    let attendanceId = null;

    if (eventName && eventStart) {
      // eslint-disable-next-line no-await-in-loop
      await getOrCreateEventType(knex, row);
      // eslint-disable-next-line no-await-in-loop
      instanceId = await getOrCreateEventInstance(knex, row);
      // eslint-disable-next-line no-await-in-loop
      attendanceId = await getOrCreateAttendance(knex, participantId, instanceId, row);
      // eslint-disable-next-line no-await-in-loop
      await createSurveyIfNeeded(knex, attendanceId, row);
    } else {
      const reason = !eventName
        ? 'missing eventname (skipped event/attendance/survey)'
        : 'missing or invalid eventdatetimestart (skipped event/attendance/survey)';
      // eslint-disable-next-line no-await-in-loop
      await auditDrop(knex, row, reason);
      console.log('[normalize] Skipping event/attendance/survey for row due to missing event data', {
        rowid: row.rowid,
        eventName,
        eventStartRaw: row.eventdatetimestart,
      });
    }

    // Milestones and donations do not depend on events, only participant.
    // eslint-disable-next-line no-await-in-loop
    await createMilestonesIfNeeded(knex, participantId, row);
    // eslint-disable-next-line no-await-in-loop
    await createDonationsIfNeeded(knex, participantId, row);

    processedCount += 1;
    console.log('[normalize] Finished row', { rowid: row.rowid, participantId, instanceId, attendanceId });
  }

  console.log('[normalize] Finished per-row normalization', { processedCount, skippedNoEmail });

  // Archive all rows into stagingarchive so there is a historical record of
  // exactly what was processed, even after stagingrawsurvey is truncated.
  console.log('[normalize] Archiving rows into stagingarchive');
  await knex.raw(`
    insert into stagingarchive (
      originalrowid,
      participantemail,
      participantfirstname,
      participantlastname,
      participantdob,
      participantrole,
      participantphone,
      participantcity,
      participantstate,
      participantzip,
      participantschooloremployer,
      participantfieldofinterest,
      eventname,
      eventtype,
      eventdescription,
      eventrecurrencepattern,
      eventdefaultcapacity,
      eventdatetimestart,
      eventdatetimeend,
      eventlocation,
      eventcapacity,
      eventregistrationdeadline,
      registrationstatus,
      registrationattendedflag,
      registrationcheckintime,
      registrationcreatedat,
      surveysatisfactionscore,
      surveyusefulnesscore,
      surveyinstructorscore,
      surveyrecommendationscore,
      surveyoverallscore,
      surveynpsbucket,
      surveycomments,
      surveysubmissiondate,
      milestonetitles,
      milestonedates,
      donationhistory,
      totaldonations
    )
    select
      rowid as originalrowid,
      participantemail,
      participantfirstname,
      participantlastname,
      participantdob,
      participantrole,
      participantphone,
      participantcity,
      participantstate,
      participantzip,
      participantschooloremployer,
      participantfieldofinterest,
      eventname,
      eventtype,
      eventdescription,
      eventrecurrencepattern,
      eventdefaultcapacity,
      eventdatetimestart,
      eventdatetimeend,
      eventlocation,
      eventcapacity,
      eventregistrationdeadline,
      registrationstatus,
      registrationattendedflag,
      registrationcheckintime,
      registrationcreatedat,
      surveysatisfactionscore,
      surveyusefulnesscore,
      surveyinstructorscore,
      surveyrecommendationscore,
      surveyoverallscore,
      surveynpsbucket,
      surveycomments,
      surveysubmissiondate,
      milestonetitles,
      milestonedates,
      donationhistory,
      totaldonations
    from stagingrawsurvey;
  `);

  console.log('[normalize] Truncating stagingrawsurvey');
  await knex.raw('TRUNCATE stagingrawsurvey;');
  console.log('--- Normalization run completed ---');
}

module.exports = runNormalization;
