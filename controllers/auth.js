// const bcrypt = require('bcryptjs');

// const prisma = require('../services/prisma');
// const server = require('../services/stellar');

// const CustomError = require('../utils/CustomError');

// const User = require('../models/User');

// async function handleLogin(req, res) {
//   const { dialCode, phoneNumber, pin } = req.body;

//   try {
//     const user = await prisma.users.findFirst({
//       where: { dial_code: dialCode, phone_number: phoneNumber },
//     });
//     if (!user) {
//       throw new CustomError({
//         code: 404,
//         message: `No user found with phone number: +${dialCode} ${phoneNumber}`,
//       });
//     }

//     const didPinMatch = await bcrypt.compare(pin.trim(), user.pin);
//     if (!didPinMatch) {
//       throw new CustomError({
//         code: 400,
//         message: 'pin is invalid, enter correct pin',
//       });
//     }

//     const account = await server.loadAccount(user.account_id);

//     const userRes = new User(user);
//     userRes.addAccountDetails(account);

//     return res.status(200).json({
//       message: 'Logged in successfully',
//       status: 'success',
//       user: userRes.toJson(),
//     });
//   } catch (error) {
//     if (error instanceof CustomError) {
//       return res
//         .status(error.code)
//         .json({ message: error.message, status: 'error' });
//     } else {
//       return res
//         .status(500)
//         .json({ message: error.toString(), status: 'error' });
//     }
//   }
// }

// module.exports = { handleLogin };
