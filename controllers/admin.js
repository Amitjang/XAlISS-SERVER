const { request, response } = require('express');
const { startOfToday, endOfToday, addMilliseconds } = require('date-fns');
const { compare } = require('bcryptjs');
const { startOfMonth } = require('date-fns');

const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');
const Admin = require('../models/Admin');
const { transactionTypes, userTypes } = require('../constants');

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

/**
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetCustomersTotalAccountBalance(req, res) {
  let data;
  try {
    data = await prisma.$queryRaw`
      SELECT SUM(account_balance) as total_balance
      FROM users`;

    data = data.map(item => ({
      ...item,
      total_balance: Number(item.total_balance),
    }));
  } catch (error) {
    return res.status(500).json({
      message: 'Error getting total customer account balance',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    message: 'Successfully fetched Total customers account balance',
    status: 'success',
    data: data,
  });
}

/**
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetAgentsTotalAccountBalance(req, res) {
  let data;
  try {
    data = await prisma.$queryRaw`
      SELECT SUM(account_balance) as total_balance
      FROM agents`;

    data = data.map(item => ({
      ...item,
      total_balance: Number(item.total_balance),
    }));
  } catch (error) {
    return res.status(500).json({
      message: 'Error getting total agent account balance',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    message: 'Successfully fetched total agent account balance',
    status: 'success',
    data: data,
  });
}

/**
 * Get the total fees that was collected this month
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalFeesThisMonth(req, res) {
  const startOfThisMonth = startOfMonth(new Date());

  let data;
  try {
    data = await prisma.$queryRaw`
      SELECT SUM(amount) as total_fees
      FROM transactions
      WHERE type = ${transactionTypes.saveCollect}
      AND created_at >= ${startOfThisMonth}`;
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error getting total fees this month',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    message: 'Succesfully fetched total fees this month',
    status: 'success',
    data: data,
  });
}

/**
 * Get total amount at term in network
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTotalAmountAtTermInNetwork(req, res) {
  const startOfThisMonth = startOfMonth(new Date());

  let data;
  try {
    data = await prisma.$queryRaw`
      SELECT SUM(amount) as total_term
      FROM contracts
      WHERE end_date >= ${startOfThisMonth}`;
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error getting total amount at term in network',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    message: 'Succesfully fetched total amount at term in network',
    status: 'success',
    data: data,
  });
}

/**
 * Get the latest registered users
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetLatestRegisteredUsers(req, res) {
  let limit = Number(req.query.limit ?? 0);
  let latestRegisteredUsers = [];

  // if limit is not present or equal to 0, return the 10 latest
  if (limit === 0) limit = 10;
  else limit = Math.abs(limit);

  try {
    const users = await prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    for (const user of users) {
      const userData = {
        id: user.id,
        agent_id: user.agent_id,
        name: user.name,
        dial_code: user.dial_code,
        phone_number: user.phone_number,
        address: user.address,
        country: user.country,
        state: user.state,
        city: user.city,
        pincode: user.pincode,
        lat: user.lat,
        lng: user.lng,
        account_balance: user.account_balance,
        verification_number: user.verification_number,
        verification_proof_image_url: user.verification_proof_image_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
      latestRegisteredUsers.push(userData);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error getting latest registered users',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    data: latestRegisteredUsers,
    message: 'Successfully fetched latest registered users',
    status: 'success',
  });
}

/**
 * Get the latest latest users
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetLatestTransactionHistory(req, res) {
  let limit = Number(req.query.limit ?? 0);
  let latestTransactionHistory;

  // if limit is not present or equal to 0, return the 10 latest
  if (limit === 0) limit = 10;
  else limit = Math.abs(limit);

  try {
    latestTransactionHistory = await prisma.transactions.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error getting latest transaction history',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    length: latestTransactionHistory.length,
    data: latestTransactionHistory,
    message: 'Successfully fetched latest transaction history',
    status: 'success',
  });
}

/**
 * Get latest events, either user creation or transactions
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetLatestEvents(req, res) {
  let latestEvents = [];

  try {
    const users = await prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const txns = await prisma.transactions.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    for (const user of users) {
      const userData = {
        id: user.id,
        agent_id: user.agent_id,
        name: user.name,
        dial_code: user.dial_code,
        phone_number: user.phone_number,
        address: user.address,
        country: user.country,
        state: user.state,
        city: user.city,
        pincode: user.pincode,
        lat: user.lat,
        lng: user.lng,
        account_balance: user.account_balance,
        verification_number: user.verification_number,
        verification_proof_image_url: user.verification_proof_image_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
      latestEvents.push({ type: 'USER_CREATE', data: userData });
    }

    const agentsTxnsIds = [];
    const usersTxnsIds = [];
    for (const txn of txns) {
      if (txn.sender_type === userTypes.Agent)
        agentsTxnsIds.push(txn.sender_id);
      else if (txn.sender_type === userTypes.User)
        usersTxnsIds.push(txn.sender_id);

      if (txn.receiver_type === userTypes.Agent)
        agentsTxnsIds.push(txn.receiver_id);
      else if (txn.receiver_type === userTypes.User)
        usersTxnsIds.push(txn.receiver_id);
    }

    const usersFromTxns = (
      await prisma.users.findMany({
        where: { id: { in: usersTxnsIds } },
        select: { id: true, dial_code: true, phone_number: true },
      })
    ).reduce((acc, cur) => {
      acc[cur.id] = {
        dial_code: cur.dial_code,
        phone_number: cur.phone_number,
      };
      return acc;
    }, {});
    const agentsFromTxns = (
      await prisma.agents.findMany({
        where: { id: { in: agentsTxnsIds } },
        select: { id: true, dial_code: true, phone_number: true },
      })
    ).reduce((acc, cur) => {
      acc[cur.id] = {
        dial_code: cur.dial_code,
        phone_number: cur.phone_number,
      };
      return acc;
    }, {});

    for (const txn of txns) {
      const txnData = {
        id: txn.id,
        contract_id: txn.contract_id,
        amount: txn.amount,
        type: txn.type,
        created_at: txn.created_at,
        updated_at: txn.updated_at,
      };

      if (txn.sender_type === userTypes.Agent)
        txnData.sender = agentsFromTxns[txn.sender_id];
      else if (txn.sender_type === userTypes.User)
        txnData.sender = usersFromTxns[txn.sender_id];

      if (txn.receiver_type === userTypes.Agent)
        txnData.receiver = agentsFromTxns[txn.receiver_id];
      else if (txn.receiver_type === userTypes.User)
        txnData.receiver = usersFromTxns[txn.receiver_id];

      latestEvents.push({
        type: 'TRANSACTION',
        data: txnData,
      });
    }

    latestEvents = latestEvents.sort((a, b) =>
      b.data.created_at > a.data.created_at ? 1 : -1
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Error getting latest events',
      status: 'error',
      error: JSON.stringify(error),
    });
  }

  return res.status(200).json({
    data: latestEvents,
    message: 'Successfully fetched latest events',
    status: 'success',
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
  handleGetCustomersTotalAccountBalance,
  handleGetAgentsTotalAccountBalance,
  handleGetTotalFeesThisMonth,
  handleGetTotalAmountAtTermInNetwork,
  handleGetLatestRegisteredUsers,
  handleGetLatestTransactionHistory,
  handleGetLatestEvents,
};
