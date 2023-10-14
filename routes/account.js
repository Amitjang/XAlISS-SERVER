const express = require('express');

const {
  handleGetAccount,
  handleCreateAccount,
} = require('../controllers/account');

const router = express.Router();

router.get('/:userId', handleGetAccount);
router.post('/', handleCreateAccount);

module.exports = router;
