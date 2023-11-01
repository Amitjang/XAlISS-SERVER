const express = require('express');

const {
  handleCreateUser,
  handleGetUser,
  handleCreateContractUser,
} = require('../controllers/user');

const upload = require('../services/multer');

const {
  getUserSchema,
  createUserSchema,
  createContractUserSchema,
} = require('../validators/user');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:userId', validate(getUserSchema), handleGetUser);
router.post(
  '/',
  upload.single('verification-proof'),
  validate(createUserSchema),
  handleCreateUser
);
router.post(
  '/create-contract',
  validate(createContractUserSchema),
  handleCreateContractUser
);

module.exports = router;
