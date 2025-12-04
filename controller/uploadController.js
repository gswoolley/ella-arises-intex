const knex = require('../util/db');

// Get upload page with optional results from last upload
async function getUploadPage(req, res) {
  const message = req.query.message || null;
  const error = req.query.error || null;
  const showResults = req.query.showResults === 'true';

  let results = null;

  if (showResults) {
    try {
      // Query the staging tables which contain only data from the most recent upload
      console.log('[upload-results] Fetching data from staging tables');
      
      const [persons, events, attendance, surveys, milestones, donations] = await Promise.all([
        // Persons from staging table
        knex('staging_personinfo')
          .select('*')
          .orderBy('personid', 'desc')
          .limit(100),
          
        // Event instances from staging
        knex('staging_eventinstances as ei')
          .leftJoin('staging_eventtypes as et', 'ei.eventname', 'et.eventname')
          .select('ei.*', 'et.eventtype', 'et.eventdescription')
          .orderBy('ei.instanceid', 'desc')
          .limit(100),
        
        // Attendance from staging
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
        
        // Surveys from staging
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
        
        // Milestones from staging
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
        
        // Donations from staging
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
    }
  }

  res.render('admin/app/csv-upload', { message, error, results });
}

module.exports = {
  getUploadPage,
};
