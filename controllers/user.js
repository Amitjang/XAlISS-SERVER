const StellarSdk = require('stellar-sdk');
const { request, response } = require('express');
const { parseISO, parse } = require('date-fns');

const server = require('../services/stellar');
const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');
const User = require('../models/User');

const {
  getEndDateForContractType,
  getSavingAndWithdrawTypeForContractType,
} = require('../constants');

async function handleCreateUser(req, res) {
  const file = req.file;
  const {
    agentId,
    name,
    dialCode,
    phoneNumber,
    address,
    country,
    state,
    city,
    pincode,
    lat,
    lng,
    verificationNumber,
  } = req.body;

  if (!file)
    return res
      .status(400)
      .json({ message: 'verification-proof is required', status: 'error' });

  try {
    const agent = await prisma.agents.findFirst({
      where: { id: parseInt(agentId, 10) },
    });
    if (!agent)
      throw new CustomError({
        code: 404,
        message: `No agent found with agentId: ${agentId}`,
      });
  } catch (error) {
    if (error instanceof CustomError)
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    else
      return res.status(500).json({
        message: error?.message ?? 'Something went wrong!',
        status: 'error',
      });
  }

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
      message: 'Error while creating account: ' + JSON.stringify(error),
    });
  }

  try {
    const account = await server.loadAccount(pair.publicKey());

    const xoftAsset = new StellarSdk.Asset(
      'XOFT',
      'GAXNW7VF5RSYJLJHNQ7MDGV23RRPPM3QU6H27NDE7TTEM7QMPIGZPKDE'
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

    const user = await prisma.users.create({
      data: {
        agent_id: parseInt(agentId, 10),

        account_id: pair.publicKey().trim(),
        account_secret: pair.secret().trim(),

        name: name.trim(),
        dial_code: dialCode.trim(),
        phone_number: phoneNumber.trim(),

        address: address.trim(),
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),

        verification_number: verificationNumber.trim(),
        verification_proof_image_url: file.filename,
      },
    });

    const userRes = new User(user);
    userRes.addAccountDetails(account);

    return res.status(201).json({
      message: 'User created successfully',
      user: userRes.toJson(),
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: 'Error while creating account: ' + JSON.stringify(err),
    });
  }
}

async function handleGetUser(req, res) {
  const userId = req.params.userId;

  try {
    if (userId.trim().length === 0)
      throw new CustomError({
        code: 400,
        message: 'accountId cannot be empty',
      });

    const user = await prisma.users.findFirst({
      where: { id: parseInt(userId, 10) },
    });

    if (!user)
      throw new CustomError({
        code: 404,
        message: `No user found for id: ${userId}`,
      });

    const account = await server.loadAccount(user.account_id);

    const userRes = new User(user);
    userRes.addAccountDetails(account);

    return res.status(200).json({
      status: 'success',
      message: 'Successfully fetched account',
      user: userRes.toJson(),
    });
  } catch (err) {
    if (err instanceof CustomError) {
      return res
        .status(err.code)
        .json({ message: err.message, status: 'error' });
    } else {
      return res.status(500).json({
        message: err?.message ?? 'Something went wrong!',
        status: 'error',
      });
    }
  }
}

/**
 * Create contract for the user
 * @param {request} req request
 * @param {response} res response
 */
async function handleCreateContractUser(req, res) {
  const {
    dialCode,
    phoneNumber,
    contractType,
    amount,
    comment,
    firstPaymentDate,
  } = req.body;

  let user;
  try {
    user = await prisma.users.findFirst({
      where: { dial_code: dialCode.trim(), phone_number: phoneNumber.trim() },
    });
    if (!user)
      throw new CustomError({
        code: 404,
        message: `No user found with phone number ${dialCode} ${phoneNumber}`,
      });
  } catch (error) {
    if (error instanceof CustomError)
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    else
      return res.status(500).json({
        message: error?.message ?? 'Something went wrong!',
        status: 'error',
      });
  }

  // save the contract
  const { saving_type, withdraw_time } =
    getSavingAndWithdrawTypeForContractType(contractType);
  const endDate = getEndDateForContractType(contractType);
  const first_payment_date = parse(firstPaymentDate, 'MM/dd/yyyy', new Date());

  try {
    const contract = await prisma.contracts.create({
      data: {
        user_id: user.id,
        user_dial_code: user.dial_code,
        user_phone_number: user.phone_number,

        saving_type: saving_type,
        withdraw_time: withdraw_time,

        amount: parseFloat(amount),
        comment: comment,

        first_payment_date: first_payment_date.toISOString(),
        end_date: endDate.toISOString(),
      },
    });

    return res.status(201).json({
      contract: contract,
      message: 'Successfully created contract',
      status: 'status',
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }
}

module.exports = {
  handleCreateUser,
  handleGetUser,
  handleCreateContractUser,
};
