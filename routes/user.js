const express = require('express');

const { handleCreateUser, handleGetUser } = require('../controllers/user');

const upload = require('../services/multer');

const { getUserSchema, createUserSchema } = require('../validators/user');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:userId', validate(getUserSchema), handleGetUser);
router.post(
  '/',
  upload.single('verification-proof'),
  validate(createUserSchema),
  handleCreateUser
);

module.exports = router;
