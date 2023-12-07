const express = require('express');

const { handleSendNotification } = require('../controllers/notification');
const validate = require('../middleware/validate');
const { sendNotificationSchema } = require('../validators/notification');

const router = express.Router();

router.post('/', validate(sendNotificationSchema), handleSendNotification);

module.exports = router;
