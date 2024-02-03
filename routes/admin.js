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
} = require('../controllers/admin');

const { loginAdminSchema } = require('../validators/admin');

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
router.get('/contracts/active', handleGetTotalActiveContractsCount);
router.get('/collection/today', handleGetTotalCashCollectedToday);
router.get('/collection/by-date', handleGetTotalCashCollectedByDate);
router.get('/payouts/today', handleGetTotalPayoutsToday);

router.get('/agents/total-account-balance', handleGetAgentsTotalAccountBalance);

module.exports = router;
