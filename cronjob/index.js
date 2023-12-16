const { lastDayOfMonthScheduler } = require('./sendBonus');
const { everyDayScheduler } = require('./sendTodayCollectionNotifications');

const startSchedulers = () => {
  console.log('Starting schedulers');
  lastDayOfMonthScheduler.start();
  everyDayScheduler.start();
};

module.exports = startSchedulers;
