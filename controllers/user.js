const StellarSdk = require('stellar-sdk');
const { request, response } = require('express');
const { parse, format } = require('date-fns');

const server = require('../services/stellar');
const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');
const User = require('../models/User');

const {
  getEndDateForContractType,
  getSavingAndWithdrawTypeForContractType,
  xoftAsset,
  CREATE_ACCOUNT_PUBLIC_KEY,
  CREATE_ACCOUNT_SECRET_KEY,
} = require('../constants');
const {
  getStellarAccount,
  createStellarAccount,
} = require('../utils/createStellarAccount');
const { sendSMS } = require('../utils/sendSMS');
const { getNotificationText } = require('../utils/getNotificationText');
const { notifications } = require('../notifications');
const getContractIntervals = require('../utils/getContractIntervals');

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

  let agent;
  try {
    agent = await prisma.agents.findFirst({
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

  // // Create a new account
  // try {
  //   await server.friendbot(pair.publicKey()).call();
  // } catch (error) {
  //   return res.status(500).json({
  //     message: 'Error while creating account: ' + JSON.stringify(error),
  //   });
  // }
  // const account = await server.loadAccount(pair.publicKey());
  // Create a trustline to the XOFT token
  // const transaction = new StellarSdk.TransactionBuilder(account, {
  //   fee: '100000',
  //   networkPassphrase: StellarSdk.Networks.TESTNET,
  // })
  //   .addOperation(
  //     StellarSdk.Operation.changeTrust({
  //       asset: xoftAsset,
  //       limit: '100000', // Set your desired limit
  //     })
  //   )
  //   .setTimeout(60)
  //   .build();
  // transaction.sign(pair);
  // await server.submitTransaction(transaction); // Sign the transaction with your secret key

  let account;
  try {
    await createStellarAccount(
      'user',
      CREATE_ACCOUNT_PUBLIC_KEY,
      CREATE_ACCOUNT_SECRET_KEY,
      pair
    );
    account = await getStellarAccount(pair.publicKey());
  } catch (error) {
    return res.status(500).json({
      message: 'Error creating wallet',
      status: 'error',
      error: error,
      extras: error?.response?.data?.extras,
    });
  }

  let user;
  try {
    user = await prisma.users.create({
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
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: 'Error while creating account: ' + JSON.stringify(err),
    });
  }

  // Send SMS to customer for account creation
  try {
    // FIX: send notification according the user language
    const smsText = getNotificationText(notifications.fr.customer_create, {
      customer_last_name: user.name,
      agent_full_name: agent.name,
      agent_phone_number: `${agent.dial_code} ${agent.phone_number}`,
    });
    await sendSMS(user.dial_code, user.phone_number, smsText);
  } catch (error) {
    console.error(
      `Error sending SMS to customer: ${user.dial_code} ${user.phone_number}, error: ${error}`
    );
  }

  const userRes = new User(user);
  userRes.addAccountDetails(account);

  return res.status(201).json({
    message: 'User created successfully',
    user: userRes.toJson(),
    status: 'success',
  });
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

    const account = await getStellarAccount(user.account_id);

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
  const userSignatureImage = req.file;
  if (!userSignatureImage)
    return res
      .status(400)
      .json({ message: 'User Signature is required', status: 'error' });

  const {
    dialCode,
    phoneNumber,
    agentDialCode,
    agentPhoneNumber,
    contractType,
    amount,
    comment,
    firstPaymentDate,
    address,
    lat,
    lng,
  } = req.body;

  let agent;
  try {
    agent = await prisma.agents.findFirst({
      where: {
        dial_code: agentDialCode.trim(),
        phone_number: agentPhoneNumber.trim(),
      },
    });
    if (!agent)
      throw new CustomError({
        code: 404,
        message: `No agent found with phone number +${dialCode
          .trim()
          .replace('+', '')} ${phoneNumber.trim()}`,
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
  const first_payment_date = parse(firstPaymentDate, 'MM/dd/yyyy', new Date());
  const { saving_type, withdraw_time } =
    getSavingAndWithdrawTypeForContractType(contractType);
  const endDate = getEndDateForContractType(contractType, first_payment_date);

  let contract;
  try {
    contract = await prisma.contracts.create({
      data: {
        agent_id: agent.id,
        user_id: user.id,

        user_dial_code: user.dial_code,
        user_phone_number: user.phone_number,
        user_sign_image_url: userSignatureImage.filename,

        saving_type: saving_type,
        withdraw_time: withdraw_time,

        amount: parseFloat(amount),
        comment: comment,

        first_payment_date: first_payment_date.toISOString(),
        end_date: endDate.toISOString(),

        address: address.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  const intervals = getContractIntervals(
    saving_type,
    first_payment_date,
    endDate
  );

  // FIX: change notification translation
  const smsText = getNotificationText(notifications.fr.contract_subscription, {
    customer_last_name: user.name,
    type_of_saving: saving_type,
    date_of_beginning: format(first_payment_date, 'dd/MM/yyy'),
    date_of_end: format(endDate, 'dd/MM/yyy'),
    amount: amount ?? 0,
    total_ammount_to_save_during_contract: intervals.length * (amount ?? 0),
  });

  try {
    await sendSMS(user.dial_code, user.phone_number, smsText);
  } catch (error) {
    console.error(
      `Error sending create contract SMS to: ${user.dial_code} ${user.phone_number}, error: ${error}`
    );
  }

  return res.status(201).json({
    contract: contract,
    message: 'Successfully created contract',
    status: 'status',
  });
}

/**
 * Cancel the contract for the user
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleCancelContractUser(req, res) {
  const { contractId } = req.body;

  try {
    await prisma.contracts.update({
      where: { id: contractId },
      data: { is_cancelled: 1 },
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

  return res
    .status(200)
    .json({ message: 'Cancelled the contract', status: 'success' });
}

module.exports = {
  handleCreateUser,
  handleGetUser,
  handleCreateContractUser,
  handleCancelContractUser,
};
