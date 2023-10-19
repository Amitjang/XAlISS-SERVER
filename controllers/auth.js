const bcrypt = require('bcryptjs');

const User = require('../models/User');
const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');

async function handleLogin(req, res) {
  const { dialCode, phoneNumber, pin } = req.body;

  try {
    const user = await prisma.users.findFirst({
      where: { dial_code: dialCode, phone_number: phoneNumber },
    });
    if (!user) {
      throw new CustomError({
        code: 404,
        message: `No user found with phone number: +${dialCode} ${phoneNumber}`,
      });
    }

    const didPinMatch = await bcrypt.compare(pin.trim(), user.pin);
    if (!didPinMatch) {
      throw new CustomError({
        code: 400,
        message: 'pin is invalid, enter correct pin',
      });
    }

    const userRes = new User(user);

    return res.status(200).json({
      message: 'Logged in successfully',
      status: 'success',
      user: userRes.toJson(),
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res
        .status(500)
        .json({ message: error.toString(), status: 'error' });
    }
  }
}

module.exports = { handleLogin };
