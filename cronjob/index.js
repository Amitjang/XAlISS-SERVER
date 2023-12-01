const { lastDayOfMonthScheduler } = require('./sendBonus');

const startSchedulers = () => {
  console.log('Starting schedulers');
  lastDayOfMonthScheduler.start();
};

module.exports = startSchedulers;
