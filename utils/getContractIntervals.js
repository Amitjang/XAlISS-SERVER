const {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  getDay,
} = require('date-fns');

/**
 * Get Contract Intervals
 * @param {string} savingType Saving Type
 * @param {Date} firstPaymentDate First Payment Date
 * @param {Date} endDate End Date
 */
const getContractIntervals = (savingType, firstPaymentDate, endDate) => {
  let intervals;
  if (savingType === 'daily') {
    intervals = eachDayOfInterval({
      start: firstPaymentDate,
      end: endDate,
    });
  } else if (savingType === 'weekly') {
    intervals = eachWeekOfInterval(
      {
        start: firstPaymentDate,
        end: endDate,
      },
      { weekStartsOn: getDay(firstPaymentDate) }
    );
  } else if (savingType === 'monthly') {
    intervals = eachMonthOfInterval({
      start: firstPaymentDate,
      end: endDate,
    });
  }

  return intervals;
};

module.exports = getContractIntervals;
