const { request, response } = require('express');
const { startOfToday, endOfToday, addMilliseconds } = require('date-fns');
const { compare } = require('bcryptjs');

const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');
const Admin = require('../models/Admin');

/**
 * Login Admin
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleLogin(req, res) {
  const { dialCode, phoneNumber, pin } = req.body;

  let admin;
  try {
    const adminData = await prisma.admins.findFirst({
      where: { dial_code: dialCode, phone_number: phoneNumber },
    });
    if (!adminData)
      throw new CustomError({
        code: 404,
        message: `No admin found with number: '${dialCode} ${phoneNumber}'`,
      });
    admin = new Admin(adminData);
  } catch (error) {
    if (error instanceof CustomError)
      return res.status(error.code).json({
        message: error.message,
        status: 'error',
      });
    else
      return res.status(500).json({
        message: '',
        status: 'error',
        error: error,
      });
  }

  try {
    const doesPinMatch = await compare(pin, admin.pin);
    if (!doesPinMatch)
      throw new CustomError({ code: 400, message: 'Invalid credentials' });
  } catch (error) {
    if (error instanceof CustomError)
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    else
      return res.status(500).json({
        message: 'Error comparing pin',
        status: 'error',
        error: error,
      });
  }

  return res.status(200).json({
    message: 'Successfully logged in',
    status: 'success',
    admin: admin.toJSON(),
  });
}

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

/**
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetCustomersRegisteredByDate(req, res) {
  let data;
  try {
    data = await prisma.$queryRaw`
      SELECT DATE(created_at) AS registered_date, COUNT(*) AS user_count
      FROM users
      GROUP BY registered_date
      ORDER BY registered_date;
    `;
    /*
     * [ { registered_date: 2023-12-31T00:00:00.000Z, user_count: 5n } ]
     * ^- structure of returned data
     *
     * need to change user_count number as it is a big int
     * and JSON.stringify() does not allow big ints
     */
    data = data.map(item => ({
      ...item,
      user_count: Number(item?.user_count ?? 0),
    }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error getting users',
      status: 'error',
      error: error,
    });
  }

  return res.status(200).json({
    message: 'Successfully fetched users registered by date',
    status: 'success',
    data: data,
  });
}

/**
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalCashCollectedByDate(req, res) {
  let data;
  try {
    data = await prisma.$queryRaw`
      SELECT DATE(created_at) AS collection_date, SUM(amount) AS total_cash_collected
      FROM transactions
      WHERE type = 'SAVE_COLLECT'
      GROUP BY collection_date
      ORDER BY collection_date;
    `;
    /*
     * [ { collection_date: 2023-12-31T00:00:00.000Z, total_cash_collected: 5n } ]
     * ^- structure of returned data
     */
    // data = data.map(item => ({
    //   ...item,
    //   user_count: Number(item?.user_count ?? 0),
    // }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error getting users',
      status: 'error',
      error: error,
    });
  }

  return res.status(200).json({
    message: 'Successfully fetched total cash collected by date',
    status: 'success',
    data: data,
  });
}

module.exports = {
  handleLogin,
  handleGetTotalCustomersCount,
  handleGetCustomersRegisteredTodayCount,
  handleGetTotalActiveContractsCount,
  handleGetTotalCashCollectedToday,
  handleGetTotalPayoutsToday,
  handleGetCustomersRegisteredByDate,
  handleGetTotalCashCollectedByDate,
};
