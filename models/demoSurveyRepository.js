/**
 * Demo Survey Repository
 * Database operations for demo_survey table
 * 
 * Functions:
 * - getDemoSurveyCount() - Get total number of survey submissions
 * - getAllDemoSurveys() - Get all survey submissions for CSV export
 * - createDemoSurvey(data) - Insert new survey submission
 * - clearDemoSurveys() - Delete all survey submissions (for demo reset)
 */

const knex = require('../util/db');

// Get count of demo survey submissions
async function getDemoSurveyCount() {
  const result = await knex('demo_survey').count('* as count').first();
  return Number(result?.count || 0);
}

// Get all demo survey submissions
async function getAllDemoSurveys() {
  return knex('demo_survey').select('*').orderBy('rowid', 'asc');
}

// Create a new demo survey submission
async function createDemoSurvey(data) {
  return knex('demo_survey').insert({
    participantemail: data.participantEmail || null,
    participantfirstname: data.participantFirstName || null,
    participantlastname: data.participantLastName || null,
    participantdob: data.participantDOB || null,
    participantrole: data.participantRole || null,
    participantphone: data.participantPhone || null,
    participantcity: data.participantCity || null,
    participantstate: data.participantState || null,
    participantzip: data.participantZip || null,
    participantschooloremployer: data.participantSchoolOrEmployer || null,
    participantfieldofinterest: data.participantFieldOfInterest || null,
    eventname: data.eventName || null,
    eventtype: data.eventType || null,
    eventdescription: data.eventDescription || null,
    eventrecurrencepattern: data.eventRecurrencePattern || null,
    eventdefaultcapacity: data.eventDefaultCapacity || null,
    eventdatetimestart: data.eventDateTimeStart || null,
    eventdatetimeend: data.eventDateTimeEnd || null,
    eventlocation: data.eventLocation || null,
    eventcapacity: data.eventCapacity || null,
    eventregistrationdeadline: data.eventRegistrationDeadline || null,
    registrationstatus: data.registrationStatus || null,
    registrationattendedflag: data.registrationAttendedFlag || null,
    registrationcheckintime: data.registrationCheckInTime || null,
    registrationcreatedat: data.registrationCreatedAt || null,
    surveysatisfactionscore: data.surveySatisfactionScore || null,
    surveyusefulnesscore: data.surveyUsefulnessScore || null,
    surveyinstructorscore: data.surveyInstructorScore || null,
    surveyrecommendationscore: data.surveyRecommendationScore || null,
    surveyoverallscore: data.surveyOverallScore || null,
    surveynpsbucket: data.surveyNPSBucket || null,
    surveycomments: data.surveyComments || null,
    surveysubmissiondate: data.surveySubmissionDate || null,
    milestonetitles: data.milestoneTitles || null,
    milestonedates: data.milestoneDates || null,
    donationhistory: data.donationHistory || null,
    totaldonations: data.totalDonations || null,
  });
}

// Clear all demo survey submissions (for resetting the demo)
async function clearDemoSurveys() {
  return knex('demo_survey').del();
}

module.exports = {
  getDemoSurveyCount,
  getAllDemoSurveys,
  createDemoSurvey,
  clearDemoSurveys,
};
