const express = require('express');

const { handleHealthCheck } = require('../controllers/health');

const router = express.Router();

router.get('/', handleHealthCheck);

module.exports = router;
