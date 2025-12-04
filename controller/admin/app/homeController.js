const knex = require('../../../util/db');

const getAdminHome = async (req, res) => {
  const hour = new Date().getHours();
  let greeting = 'Good afternoon';

  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 18) {
    greeting = 'Good evening';
  }

  try {
    const [
      upcomingEventsResult,
      satisfactionResult,
      monthlyDonationsResult,
      activeParticipantsResult,
    ] = await Promise.all([
      // Upcoming Events
      knex.raw(
        `SELECT COUNT(*)::int AS upcoming_events
         FROM eventinstances
         WHERE eventdatetimestart >= NOW()`
      ),
      // Satisfaction (last 100 days)
      knex.raw(
        `SELECT ROUND(AVG(surveyoverallscore), 2) AS avg_satisfaction
         FROM surveyinstances
         WHERE surveysubmissiondate >= NOW() - INTERVAL '100 days'`
      ),
      // Total Donations This Month
      knex.raw(
        `SELECT COALESCE(SUM(donationamount), 0) AS monthly_donations
         FROM participantdonations
         WHERE DATE_TRUNC('month', donationdate) = DATE_TRUNC('month', NOW())`
      ),
      // Active Participants
      knex.raw(
        `SELECT COUNT(*)::int AS active_participants
         FROM participantinfo`
      ),
    ]);

    const upcomingEvents =
      (upcomingEventsResult.rows[0] &&
        upcomingEventsResult.rows[0].upcoming_events) || 0;
    const avgSatisfaction =
      (satisfactionResult.rows[0] &&
        Number(satisfactionResult.rows[0].avg_satisfaction)) || 0;
    const monthlyDonations =
      (monthlyDonationsResult.rows[0] &&
        Number(monthlyDonationsResult.rows[0].monthly_donations)) || 0;
    const activeParticipants =
      (activeParticipantsResult.rows[0] &&
        activeParticipantsResult.rows[0].active_participants) || 0;

    const kpis = {
      upcomingEvents,
      avgSatisfaction,
      monthlyDonations,
      activeParticipants,
    };

    res.render('admin/app/home-dashboard', {
      user: req.session.user,
      greeting,
      kpis,
    });
  } catch (error) {
    console.error('Error loading admin home KPIs:', error);

    res.render('admin/app/home-dashboard', {
      user: req.session.user,
      greeting,
      kpis: {
        upcomingEvents: 0,
        avgSatisfaction: 0,
        monthlyDonations: 0,
        activeParticipants: 0,
      },
    });
  }
};

module.exports = {
  getAdminHome,
};
