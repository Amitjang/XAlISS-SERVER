const StellarSdk = require('stellar-sdk');
const bcrypt = require('bcryptjs');

const server = require('../services/stellar');
const prisma = require('../services/prisma');
const CustomError = require('../utils/CustomError');
const User = require('../models/User');

async function handleCreateAccount(req, res) {
  const {
    dialCode,
    phoneNumber,
    name,
    email,
    address,
    country,
    state,
    city,
    pincode,
    lat,
    lng,
    gender,
    occupation,
    relativeDialCode,
    relativePhoneNumber,
    pin,
  } = req.body;

  // check if phone number is already in use
  try {
    const user = await prisma.users.findFirst({
      where: { dial_code: dialCode.trim(), phone_number: phoneNumber.trim() },
    });
    if (user) {
      throw new CustomError({
        code: 400,
        message: `+${dialCode.trim()} ${phoneNumber.trim()} phone number is already in use`,
      });
    }
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res.status(500).json({ message: error, status: 'error' });
    }
  }

  const pair = StellarSdk.Keypair.random(); // Generate key pair

  // Create a new account
  try {
    await server.friendbot(pair.publicKey()).call();
  } catch (error) {
    return res.status(500).json({
      message: 'Error while creating account: ' + JSON.stringify(err),
    });
  }

  try {
    const account = await server.loadAccount(pair.publicKey());

    const xoftAsset = new StellarSdk.Asset(
      'XOFT',
      'GA4JRGRE2ZR3INNBMMOS3IZVLC5DLTUVEAWVMWHTPB5ZHWRMGQPLZ2QG'
    ); // Create a trustline to the XOFT token
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: xoftAsset,
          limit: '100000', // Set your desired limit
        })
      )
      .setTimeout(60)
      .build();

    transaction.sign(pair);
    await server.submitTransaction(transaction); // Sign the transaction with your secret key

    const hashedPin = await bcrypt.hash(pin.trim(), 10);

    const user = await prisma.users.create({
      data: {
        account_id: account.id,
        account_secret: pair.secret(),
        dial_code: dialCode.trim(),
        phone_number: phoneNumber.trim(),
        name: name.trim(),
        email: email.trim(),
        address: address.trim(),
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        lat: lat,
        lng: lng,
        pin: hashedPin,
        gender: gender.trim(),
        occupation: occupation.trim(),
        relative_dial_code: relativeDialCode.trim(),
        relative_phone_number: relativePhoneNumber.trim(),
      },
    });

    const userRes = new User(user);

    return res.status(201).json({
      message: 'User account created successfully',
      user: userRes.toJson(),
    });
  } catch (err) {
    return res.status(400).json({
      message: 'Error while creating account: ' + JSON.stringify(err),
    });
  }
}

async function handleGetAccount(req, res) {
  const userId = req.params.userId;

  try {
    if (userId.trim().length === 0)
      throw new Error('accountId cannot be empty');

    const user = await prisma.users.findFirst({
      where: { id: parseInt(userId, 10) },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: 'No user found for id: ' + userId });
    }

    const account = await server.loadAccount(user.account_id);
    return res
      .status(200)
      .json({ account, message: 'Successfully fetched account' });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err?.message ?? 'Something went wrong!' });
  }
}

module.exports = { handleCreateAccount, handleGetAccount };
