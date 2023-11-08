const express = require('express');

const {
  handleSendPayment,
  handleGetTodayPendingCollections,
} = require('../controllers/payment');
const {
  sendPaymentSchema,
  getTodayPendingCollectionsSchema,
} = require('../validators/payment');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/', validate(sendPaymentSchema), handleSendPayment);
router.get(
  '/today-pending',
  validate(getTodayPendingCollectionsSchema),
  handleGetTodayPendingCollections
);

module.exports = router;
