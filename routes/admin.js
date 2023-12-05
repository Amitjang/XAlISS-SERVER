const express = require('express');
const {
  handleGetTotalCustomersCount,
  handleGetTotalActiveContractsCount,
  handleGetCustomersRegisteredTodayCount,
  handleGetTotalCashCollectedToday,
  handleGetTotalPayoutsToday,
} = require('../controllers/admin');
const router = express.Router();

router.get('/customers/total', handleGetTotalCustomersCount);
router.get(
  '/customers/registered-today',
  handleGetCustomersRegisteredTodayCount
);
router.get('/contracts/active', handleGetTotalActiveContractsCount);
router.get('/collection/today', handleGetTotalCashCollectedToday);
router.get('/payouts/today', handleGetTotalPayoutsToday);

module.exports = router;
