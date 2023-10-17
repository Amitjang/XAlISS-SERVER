const express = require('express');

const {
  handleGetAccount,
  handleCreateAccount,
} = require('../controllers/account');

const {
  createAccountSchema,
  getAccountSchema,
} = require('../validators/account');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:userId', validate(getAccountSchema), handleGetAccount);
router.post('/', validate(createAccountSchema), handleCreateAccount);

module.exports = router;
