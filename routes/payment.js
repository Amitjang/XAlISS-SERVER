const express = require('express');

const { handleSendPayment } = require('../controllers/payment');
const { sendPaymentSchema } = require('../validators/payment');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/', validate(sendPaymentSchema), handleSendPayment);

module.exports = router;
