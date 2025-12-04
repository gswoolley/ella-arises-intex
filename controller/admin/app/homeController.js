const eventRepository = require('../../../models/eventRepository');
const surveyRepository = require('../../../models/surveyRepository');
const participantRepository = require('../../../models/participantRepository');
const donationRepository = require('../../../models/donationRepository');

const getAdminHome = async (req, res) => {
  const hour = new Date().getHours();
  let greeting = 'Good afternoon';

  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 18) {
    greeting = 'Good evening';
  }

  const managerNotice = req.session && req.session.managerNotice;
  if (req.session && req.session.managerNotice) {
    delete req.session.managerNotice;
  }

  try {
    const [upcomingEvents, avgSatisfaction, monthlyDonations, activeParticipants] =
      await Promise.all([
        eventRepository.getUpcomingEventsCount(),
        surveyRepository.getAvgSatisfactionLast100Days(),
        donationRepository.getMonthlyTotal(),
        participantRepository.getActiveParticipantsCount(),
      ]);

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
      managerNotice,
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
      managerNotice,
    });
  }
};

module.exports = {
  getAdminHome,
};
