const express = require('express');

const { handleLogin } = require('../controllers/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/auth');

const router = express.Router();

router.post('/login', validate(loginSchema), handleLogin);

module.exports = router;
