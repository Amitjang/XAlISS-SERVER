const express = require('express');

const {
  handleGetAccount,
  handleCreateAccount,
  handleAgentLogin,
  handleGetAgentSecretKey,
  handleForgotPinAgent,
  handleSetNewPinAgent,
  handleGetUsersByAgentId,
  handleGetAgentTransactions,
} = require('../controllers/agent');

const upload = require('../services/multer');

const {
  createAccountSchema,
  getAccountSchema,
  loginAgentSchema,
  getAgentSecretKeySchema,
  forgotPinAgentSchema,
  setNewPinAgentSchema,
  getUsersByAgentIdSchema,
  getAgentTransactionsSchema,
} = require('../validators/agent');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:agentId', validate(getAccountSchema), handleGetAccount);
router.get(
  '/:agentId/users',
  validate(getUsersByAgentIdSchema),
  handleGetUsersByAgentId
);
router.get(
  '/:agentId/transactions',
  validate(getAgentTransactionsSchema),
  handleGetAgentTransactions
);
router.post(
  '/',
  upload.single('verification-proof'), // single verification proof image
  validate(createAccountSchema),
  handleCreateAccount
);
router.post('/login', validate(loginAgentSchema), handleAgentLogin);
router.post(
  '/forgot-pin',
  validate(forgotPinAgentSchema),
  handleForgotPinAgent
);
router.post(
  '/set-new-pin',
  validate(setNewPinAgentSchema),
  handleSetNewPinAgent
);
router.post(
  '/secret',
  validate(getAgentSecretKeySchema),
  handleGetAgentSecretKey
);

module.exports = router;
