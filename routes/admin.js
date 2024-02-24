const express = require('express');
const {
  handleGetTotalCustomersCount,
  handleGetTotalActiveContractsCount,
  handleGetCustomersRegisteredTodayCount,
  handleGetTotalCashCollectedToday,
  handleGetTotalPayoutsToday,
  handleGetCustomersRegisteredByDate,
  handleGetTotalCashCollectedByDate,
  handleLogin,
  handleGetCustomersTotalAccountBalance,
  handleGetAgentsTotalAccountBalance,
  handleGetTotalFeesThisMonth,
  handleGetTotalAmountAtTermInNetwork,
  handleGetLatestRegisteredUsers,
  handleGetLatestTransactionHistory,
} = require('../controllers/admin');

const {
  loginAdminSchema,
  getLatestRegisteredUsersSchema,
  getLatestTransactionHistorySchema,
} = require('../validators/admin');

const validate = require('../middleware/validate');

const router = express.Router();

// Auth Routes
router.post('/auth/login', validate(loginAdminSchema), handleLogin);

router.get('/customers/total', handleGetTotalCustomersCount);
router.get(
  '/customers/registered-today',
  handleGetCustomersRegisteredTodayCount
);
router.get('/customers/registered-by-date', handleGetCustomersRegisteredByDate);
router.get(
  '/customers/total-account-balance',
  handleGetCustomersTotalAccountBalance
);
router.get(
  '/customers/latest-registered',
  validate(getLatestRegisteredUsersSchema),
  handleGetLatestRegisteredUsers
);

router.get('/contracts/active', handleGetTotalActiveContractsCount);
router.get(
  '/contracts/total-amount-in-term',
  handleGetTotalAmountAtTermInNetwork
);

router.get('/collection/today', handleGetTotalCashCollectedToday);
router.get('/collection/by-date', handleGetTotalCashCollectedByDate);
router.get('/collection/this-month', handleGetTotalFeesThisMonth);

router.get('/payouts/today', handleGetTotalPayoutsToday);

router.get('/agents/total-account-balance', handleGetAgentsTotalAccountBalance);

router.get(
  '/transactions/latest',
  validate(getLatestTransactionHistorySchema),
  handleGetLatestTransactionHistory
);

module.exports = router;
