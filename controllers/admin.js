const { request, response } = require('express');
const prisma = require('../services/prisma');
const { startOfToday, endOfToday, addMilliseconds } = require('date-fns');

/**
 * Get Customers Count
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalCustomersCount(req, res) {
  let customersCount = 0;

  try {
    customersCount = await prisma.users.count();
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res.status(200).json({
    customersCount: customersCount,
    message: 'Successfully fetched total customers count',
    status: 'success',
  });
}

/**
 * Get Customers Registered Today Count
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetCustomersRegisteredTodayCount(req, res) {
  let customersRegisteredTodayCount = 0;

  const todayStart = startOfToday();
  const todayEnd = addMilliseconds(endOfToday(), 1);

  try {
    customersRegisteredTodayCount = await prisma.users.count({
      where: {
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res.status(200).json({
    customersRegisteredTodayCount: customersRegisteredTodayCount,
    message: 'Successfully fetched customers registered today count',
    status: 'success',
  });
}

/**
 * Get Total Active Contracts Count
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalActiveContractsCount(req, res) {
  let activeContractsCount = 0;

  const today = startOfToday();

  try {
    activeContractsCount = await prisma.contracts.count({
      where: { end_date: { gte: today } },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res.status(200).json({
    contractsCount: activeContractsCount,
    message: 'Successfully fetched total active contracts count',
    status: 'success',
  });
}

/**
 * Get Total Cash Collected Today
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalCashCollectedToday(req, res) {
  let totalCashCollectedToday = 0;

  const todayStart = startOfToday();
  const todayEnd = addMilliseconds(endOfToday(), 1);

  try {
    const txns = await prisma.transactions.findMany({
      where: {
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { amount: true },
    });

    totalCashCollectedToday = txns.reduce((acc, cur) => (acc += cur.amount), 0);
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res.status(200).json({
    cashCollectedToday: totalCashCollectedToday,
    message: 'Successfully fetched total cash collected today',
    status: 'success',
  });
}

/**
 * Get Total Payout today
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalPayoutsToday(req, res) {
  let totalPayoutsToday = 0;

  const todayStart = startOfToday();
  const todayEnd = addMilliseconds(endOfToday(), 1);

  try {
    const bonus_history = await prisma.bonus_history.findMany({
      where: {
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { bonus_amount: true },
    });

    totalPayoutsToday = bonus_history.reduce(
      (acc, cur) => (acc += cur.bonus_amount),
      0
    );
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res.status(200).json({
    payoutsToday: totalPayoutsToday,
    message: 'Successfully fetched total payouts today',
    status: 'success',
  });
}

module.exports = {
  handleGetTotalCustomersCount,
  handleGetCustomersRegisteredTodayCount,
  handleGetTotalActiveContractsCount,
  handleGetTotalCashCollectedToday,
  handleGetTotalPayoutsToday,
};
