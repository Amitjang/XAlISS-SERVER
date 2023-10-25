const express = require('express');

const {
  handleGetAccount,
  handleCreateAccount,
  handleAgentLogin,
} = require('../controllers/agent');

const upload = require('../services/multer');

const {
  createAccountSchema,
  getAccountSchema,
  loginAgentSchema,
} = require('../validators/agent');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:agentId', validate(getAccountSchema), handleGetAccount);
router.post(
  '/',
  upload.single('verification-proof'), // single verification proof image
  validate(createAccountSchema),
  handleCreateAccount
);
router.post('/login', validate(loginAgentSchema), handleAgentLogin);

module.exports = router;
