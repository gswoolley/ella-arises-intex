// Upload Controller - CSV upload page and results display

const knex = require('../util/db');

// Render upload page with optional results from staging tables
async function getUploadPage(req, res) {
  // Extract query parameters for messages and result display flag
  const message = req.query.message || null;
  const error = req.query.error || null;
  const showResults = req.query.showResults === 'true';

  let results = null;

  // If showResults flag is set, fetch data from staging tables
  // These tables are cleared at the start of each upload and populated
  // during normalization, so they contain only the most recent upload data
  if (showResults) {
    try {
      console.log('[upload-results] Fetching data from staging tables');
      
      // Query all staging tables in parallel for performance
      // Each query is limited to 100 records and ordered by ID descending (newest first)
      const [persons, events, attendance, surveys, milestones, donations] = await Promise.all([
        // Query 1: Person Info from staging
        // Shows all participants added/updated in this upload
        knex('staging_personinfo')
          .select('*')
          .orderBy('personid', 'desc')
          .limit(100),
          
        // Query 2: Event Instances from staging
        // Shows all event instances created in this upload
        // Joins with event types to get type and description
        knex('staging_eventinstances as ei')
          .leftJoin('staging_eventtypes as et', 'ei.eventname', 'et.eventname')
          .select('ei.*', 'et.eventtype', 'et.eventdescription')
          .orderBy('ei.instanceid', 'desc')
          .limit(100),
        
        // Query 3: Attendance Records from staging
        // Shows all participant-event attendance records created in this upload
        // Joins with person info and event instances for display
        knex('staging_participantattendanceinstances as a')
          .leftJoin('staging_personinfo as p', 'a.personid', 'p.personid')
          .leftJoin('staging_eventinstances as ei', 'a.instanceid', 'ei.instanceid')
          .select(
            'a.*',
            'p.personfirstname',
            'p.personlastname',
            'p.personemail',
            'ei.eventname',
            'ei.eventdatetimestart'
          )
          .orderBy('a.attendanceinstanceid', 'desc')
          .limit(100),
        
        // Query 4: Survey Responses from staging
        // Shows all survey responses created in this upload
        // Joins with attendance and person info to show who submitted the survey
        knex('staging_surveyinstances as s')
          .join('staging_participantattendanceinstances as a', 's.attendanceinstanceid', 'a.attendanceinstanceid')
          .leftJoin('staging_personinfo as p', 'a.personid', 'p.personid')
          .select(
            's.*',
            'p.personfirstname',
            'p.personlastname',
            'p.personemail'
          )
          .orderBy('s.attendanceinstanceid', 'desc')
          .limit(100),
        
        // Query 5: Participant Milestones from staging
        // Shows all milestones created in this upload
        // Joins with person info to show whose milestone it is
        knex('staging_participantmilestones as m')
          .leftJoin('staging_personinfo as p', 'm.personid', 'p.personid')
          .select(
            'm.*',
            'p.personfirstname',
            'p.personlastname',
            'p.personemail'
          )
          .orderBy('m.participantmilestoneid', 'desc')
          .limit(100),
        
        // Query 6: Donations from staging
        // Shows all donations created in this upload
        // Joins with person info to show who made the donation
        knex('staging_donations as d')
          .leftJoin('staging_personinfo as p', 'd.personid', 'p.personid')
          .select(
            'd.*',
            'p.personfirstname',
            'p.personlastname',
            'p.personemail'
          )
          .orderBy('d.donationid', 'desc')
          .limit(100),
      ]);

      // Package all results into a single object for the view
      results = {
        persons,
        events,
        attendance,
        surveys,
        milestones,
        donations,
      };
    } catch (err) {
      console.error('Error fetching upload results:', err);
      // If there's an error fetching results, results will remain null
      // and the view will handle the empty state
    }
  }

  // Render the CSV upload page with messages and optional results
  res.render('admin/app/csv-upload', { message, error, results });
}

module.exports = {
  getUploadPage,
};
