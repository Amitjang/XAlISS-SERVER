const express = require('express');

const {
  handleCreateUser,
  handleGetUser,
  handleCreateContractUser,
  handleCancelContractUser,
} = require('../controllers/user');

const { upload } = require('../services/multer');

const {
  getUserSchema,
  createUserSchema,
  createContractUserSchema,
  cancelContractUserSchema,
} = require('../validators/user');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:userId', validate(getUserSchema), handleGetUser);
router.post(
  '/',
  upload('../uploads/users/verification-proof/').single('verification-proof'),
  validate(createUserSchema),
  handleCreateUser
);
router.post(
  '/create-contract',
  upload('../uploads/users/signature/').single('userSignature'),
  validate(createContractUserSchema),
  handleCreateContractUser
);
router.delete(
  '/delete-contract',
  validate(cancelContractUserSchema),
  handleCancelContractUser
);

module.exports = router;
