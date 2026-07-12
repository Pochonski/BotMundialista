const { Router } = require('express');
const controller = require('../controllers/footballController');

const router = Router();

router.get('/matches', controller.getMatches);
router.get('/matches/live', controller.getLiveMatches);
router.get('/matches/featured', controller.getFeaturedMatch);
router.get('/matches/:id', controller.getMatchById);
router.get('/matches/:id/stats', controller.getMatchStats);
router.get('/matches/:id/h2h', controller.getMatchH2h);
router.get('/matches/:id/lineups', controller.getMatchLineups);
router.get('/matches/:id/pre-stats', controller.getMatchPreStats);
router.get('/matches/:id/tips', controller.getMatchTips);
router.get('/matches/:id/trends', controller.getMatchTrends);
router.get('/matches/:id/predictions', controller.getMatchPredictions);
router.get('/matches/:id/timeline', controller.getMatchTimeline);
router.get('/matches/:id/suggestions', controller.getMatchSuggestions);

router.get('/standings', controller.getStandings);
router.get('/brackets', controller.getBrackets);
router.get('/history/stats', controller.getHistoryStats);
router.get('/history/:seasonNum/match-stats', controller.getHistoryMatchStats);
router.get('/history/:seasonNum/match-overview', controller.getHistoryMatchOverview);
router.get('/history/:seasonNum/description', controller.getHistoryDescription);
router.get('/history/:seasonNum', controller.getHistoryBySeason);
router.get('/history', controller.getHistory);

router.get('/stats/scorers', controller.getTopScorers);
router.get('/stats/assists', controller.getTopAssists);
router.get('/stats/ratings', controller.getTopRatings);
router.get('/stats/team-of-week', controller.getTeamOfWeek);

router.get('/trends', controller.getCompetitionTrends);

router.get('/news', controller.getNews);
router.get('/news/game/:id', controller.getNewsByGame);

router.get('/athletes', controller.searchAthletes);
router.get('/athletes/:id', controller.getAthleteById);
router.get('/athletes/:id/career', controller.getAthleteCareer);
router.get('/athletes/:id/trophies', controller.getAthleteTrophies);
router.get('/athletes/:id/transfers', controller.getAthleteTransfers);

router.get('/teams', controller.getTeams);
router.get('/teams/:id', controller.getTeamById);
router.get('/teams/:id/matches', controller.getTeamMatches);

router.get('/countries', controller.getCountries);
router.get('/tournament-info', controller.getTournamentInfo);

module.exports = router;
