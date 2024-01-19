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
  handleGetAgentNotifications,
  handleGetAgentSubscribedContracts,
} = require('../controllers/agent');

const { upload } = require('../services/multer');

const {
  createAccountSchema,
  getAccountSchema,
  loginAgentSchema,
  getAgentSecretKeySchema,
  forgotPinAgentSchema,
  setNewPinAgentSchema,
  getUsersByAgentIdSchema,
  getAgentTransactionsSchema,
  getAgentSubscribedContracts,
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
  upload('../uploads/agents/verification-proof/').single('verification-proof'), // single verification proof image
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
router.get('/notifications/:agentId', handleGetAgentNotifications);
router.get(
  '/:agentId/contracts',
  validate(getAgentSubscribedContracts),
  handleGetAgentSubscribedContracts
);

module.exports = router;
