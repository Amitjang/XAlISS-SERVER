const StellarSdk = require('stellar-sdk');
const bcrypt = require('bcryptjs');
const { request, response } = require('express');

const server = require('../services/stellar');
const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');

const Agent = require('../models/Agent');
const { xoftAsset } = require('../constants');
const User = require('../models/User');

async function handleCreateAgent(req, res) {
  const file = req.file;
  const {
    name,
    email,
    dialCode,
    phoneNumber,
    gender,
    dateOfBirth,
    occupation,
    relativeDialCode,
    relativePhoneNumber,
    verificationNumber,
    pin,
    transactionPin,

    address,
    country,
    state,
    city,
    pincode,
    lat,
    lng,

    deviceToken,
    deviceType,
  } = req.body;

  if (!file)
    return res
      .status(400)
      .json({ message: 'verification-proof is required', status: 'error' });

  // check if phone number is already in use
  try {
    const agent = await prisma.agents.findFirst({
      where: { dial_code: dialCode.trim(), phone_number: phoneNumber.trim() },
    });
    if (agent) {
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
  const bonusKeyPair = StellarSdk.Keypair.random(); // Generate key pair

  // Create a new account
  try {
    await server.friendbot(pair.publicKey()).call();
  } catch (error) {
    return res.status(500).json({
      message: 'Error while creating account: ' + JSON.stringify(error),
    });
  }
  // Create a bonus account
  try {
    await server.friendbot(bonusKeyPair.publicKey()).call();
  } catch (error) {
    return res.status(500).json({
      message: 'Error while creating bonus wallet: ' + JSON.stringify(error),
    });
  }

  try {
    const account = await server.loadAccount(pair.publicKey());
    const bonusAccount = await server.loadAccount(bonusKeyPair.publicKey());

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

    const bonusAccountTransaction = new StellarSdk.TransactionBuilder(
      bonusAccount,
      {
        fee: '100000',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      }
    )
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: xoftAsset,
          limit: '100000', // Set your desired limit
        })
      )
      .setTimeout(60)
      .build();

    bonusAccountTransaction.sign(bonusKeyPair);
    await server.submitTransaction(bonusAccountTransaction); // Sign the transaction with your secret key

    const hashedPin = await bcrypt.hash(pin.trim(), 10);
    const hashedTransactionPin = await bcrypt.hash(transactionPin.trim(), 10);

    const agent = await prisma.agents.create({
      data: {
        account_id: account.id,
        account_secret: pair.secret(),
        dial_code: dialCode.trim(),
        phone_number: phoneNumber.trim(),
        name: name.trim(),
        email: email?.trim(),
        address: address.trim(),
        country: country.trim(),
        state: state?.trim(),
        city: city?.trim(),
        pincode: pincode.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        pin: hashedPin,
        gender: gender.trim(),
        occupation: occupation.trim(),
        relative_dial_code: relativeDialCode.trim(),
        relative_phone_number: relativePhoneNumber.trim(),
        verification_number: verificationNumber.trim(),
        date_of_birth: dateOfBirth.trim(),
        transaction_pin: hashedTransactionPin,
        verification_proof_image_url: file.filename,
        bonus_wallet_public_key: bonusAccount.id,
        bonus_wallet_secret_key: bonusKeyPair.secret(),
        device_token: deviceToken ?? '',
        device_type: deviceType ?? '',
      },
    });

    const agentRes = new Agent(agent);
    agentRes.addAccountDetails(account);
    agentRes.addBonusAccountDetails(bonusAccount);

    return res.status(201).json({
      message: 'Agent created successfully',
      agent: agentRes.toJson(),
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: '(119) Error while creating account: ' + JSON.stringify(err),
    });
  }
}

async function handleGetAgent(req, res) {
  const agentId = req.params.agentId;

  try {
    const agent = await prisma.agents.findFirst({
      where: { id: parseInt(agentId, 10) },
    });

    if (!agent) {
      return res
        .status(404)
        .json({ message: 'No agent found for id: ' + agentId });
    }

    const agentRes = new Agent(agent);

    const account = await server.loadAccount(agent.account_id);
    if (agent.bonus_wallet_public_key.length > 0) {
      const bonusWallet = await server.loadAccount(
        agent.bonus_wallet_public_key
      );
      agentRes.addBonusAccountDetails(bonusWallet);
    }

    agentRes.addAccountDetails(account);

    return res.status(200).json({
      message: 'Successfully fetched account',
      agent: agentRes.toJson(),
    });
  } catch (err) {
    console.error('handleGetAgent error:', err);
    return res
      .status(500)
      .json({ message: err?.message ?? 'Something went wrong!' });
  }
}

async function handleAgentLogin(req, res) {
  const { dialCode, phoneNumber, pin, deviceToken, deviceType } = req.body;

  try {
    const agent = await prisma.agents.findFirst({
      where: { dial_code: dialCode, phone_number: phoneNumber },
    });
    if (!agent) {
      throw new CustomError({
        code: 404,
        message: `No agent found with phone number: +${dialCode} ${phoneNumber}`,
      });
    }

    const didPinMatch = await bcrypt.compare(pin.trim(), agent.pin);
    if (!didPinMatch) {
      throw new CustomError({
        code: 400,
        message: 'pin is invalid, enter correct pin',
      });
    }

    const account = await server.loadAccount(agent.account_id);
    let bonusWallet;

    const updateData = {
      device_token: deviceToken ?? '',
      device_type: deviceType ?? '',
    };

    // if agent does not have a bonus wallet, create one
    if (agent.bonus_wallet_public_key.length === 0) {
      const bonusKeyPair = StellarSdk.Keypair.random();

      // Create a bonus wallet
      try {
        await server.friendbot(bonusKeyPair.publicKey()).call();
      } catch (error) {
        return res.status(500).json({
          message:
            'Error while initiating bonus wallet: ' + JSON.stringify(error),
        });
      }

      bonusWallet = await server.loadAccount(bonusKeyPair.publicKey());

      const bonusAccountTransaction = new StellarSdk.TransactionBuilder(
        bonusWallet,
        {
          fee: '100000',
          networkPassphrase: StellarSdk.Networks.TESTNET,
        }
      )
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: xoftAsset,
            limit: '100000', // Set your desired limit
          })
        )
        .setTimeout(60)
        .build();

      bonusAccountTransaction.sign(bonusKeyPair);
      await server.submitTransaction(bonusAccountTransaction); // Sign the transaction with your secret key

      updateData.bonus_wallet_public_key = bonusWallet.account_id;
      updateData.bonus_wallet_secret_key = bonusKeyPair.secret();
    } else {
      bonusWallet = await server.loadAccount(agent.bonus_wallet_public_key);
    }

    const agentRes = new Agent(agent);
    agentRes.addAccountDetails(account);
    agentRes.addBonusAccountDetails(bonusWallet);

    await prisma.agents.update({
      where: { id: agent.id },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      status: 'success',
      agent: agentRes.toJson(),
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

/**
 * Forgot Pin Agent API
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleForgotPinAgent(req, res) {
  const { dialCode, phoneNumber } = req.body;

  try {
    const agent = await prisma.agents.findFirst({
      where: { dial_code: dialCode.trim(), phone_number: phoneNumber.trim() },
    });
    if (!agent)
      throw new CustomError({
        code: 404,
        message: `No user found for phoneNumber: ${dialCode} ${phoneNumber}`,
      });
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res.status(500).json({
        message: error?.message ?? 'Something went wrong!',
        status: 'error',
      });
    }
  }

  return res
    .status(200)
    .json({ message: 'Succesfully sent OTP', status: 'success' });
}

/**
 * Set new PIN
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleSetNewPinAgent(req, res) {
  const { dialCode, phoneNumber, pin } = req.body;

  try {
    const agent = await prisma.agents.findFirst({
      where: { dial_code: dialCode.trim(), phone_number: phoneNumber.trim() },
    });
    if (!agent)
      throw new CustomError({
        code: 404,
        message: `No user found for phoneNumber: ${dialCode} ${phoneNumber}`,
      });

    const pinHash = await bcrypt.hash(pin.trim(), 8);

    await prisma.agents.update({
      data: { pin: pinHash },
      where: { id: agent.id },
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res.status(500).json({
        message: error?.message ?? 'Something went wrong!',
        status: 'error',
      });
    }
  }

  return res
    .status(200)
    .json({ message: 'Successfully set new PIN', status: 'success' });
}

async function handleGetAgentSecretKey(req, res) {
  const { dialCode, phoneNumber, transactionPin } = req.body;
  try {
    const agent = await prisma.agents.findFirst({
      where: { dial_code: dialCode.trim(), phone_number: phoneNumber.trim() },
    });
    if (!agent)
      throw new CustomError({
        code: 404,
        message: `No agent found with phone number +${dialCode.replace(
          '+',
          ''
        )} ${phoneNumber}`,
      });

    const didMatch = await bcrypt.compare(
      transactionPin.trim(),
      agent.transaction_pin
    );
    if (!didMatch)
      throw new CustomError({ code: 400, message: 'Invalid transaction pin' });

    return res.status(200).json({
      secretKey: agent.account_secret,
      message: 'Success',
      status: 'success',
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res.status(500).json({
        message: err?.message ?? 'Something went wrong!',
        status: 'error',
      });
    }
  }
}

/**
 * Get Users created by the Agent
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetUsersByAgentId(req, res) {
  const { agentId } = req.params;

  let users;
  try {
    const agent = await prisma.agents.findFirst({
      where: { id: parseInt(agentId, 10) },
    });
    if (!agent) throw new CustomError({ code: 404, message: 'No agent found' });

    users = await prisma.users.findMany({ where: { agent_id: agent.id } });
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

  return res.status(200).json({
    users: users,
    message: 'Successfully fetched users',
    status: 'success',
  });
}

/**
 * Get Agent Transactions
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetAgentTransactions(req, res) {
  const { agentId } = req.params;

  try {
    const agent = await prisma.agents.findFirst({
      where: { id: parseInt(agentId, 10) },
    });
    if (!agent) throw new CustomError({ code: 404, message: 'No agent found' });

    const transactions = await prisma.transactions.findMany({
      where: {
        OR: [
          { receiver_id: agent.id, receiver_type: 1 },
          { sender_id: agent.id, sender_type: 1 },
        ],
      },
    });

    const usersIds = [];
    const agentsIds = [];
    transactions.forEach(txn => {
      // receiver can either be agent or user
      if (txn.receiver_type === 1) agentsIds.push(txn.receiver_id);
      else if (txn.receiver_type === 2) usersIds.push(txn.receiver_id);

      // sender can either be agent or user
      if (txn.sender_type === 1) agentsIds.push(txn.receiver_id);
      else if (txn.sender_type === 2) usersIds.push(txn.receiver_id);
    });

    // get all the agent and user from the sender and receiver in transactions
    const agents = await prisma.agents.findMany({
      where: { id: { in: agentsIds } },
    });
    const users = await prisma.users.findMany({
      where: { id: { in: usersIds } },
    });

    // store agent and user in maps for faster accessibility
    const agentsMap = {};
    agents.forEach(a => {
      agentsMap[a.id] = new Agent(a);
    });
    const usersMap = {};
    users.forEach(u => {
      usersMap[u.id] = new User(u);
    });

    // finalize response
    const txnsRes = [];
    transactions.forEach(txn => {
      const txnRes = {
        id: txn.id,
        contract_id: txn.contract_id,
        amount: txn.amount,
        created_at: txn.created_at,
      };
      // sender can be agent or user
      if (txn.sender_type === 1)
        txnRes.sender = agentsMap[txn.sender_id]?.toJson() ?? {};
      else if (txn.sender_type === 2)
        txnRes.sender = usersMap[txn.sender_id]?.toJson() ?? {};

      // receiver can be agent or user
      if (txn.receiver_type === 1)
        txnRes.receiver = agentsMap[txn.receiver_id]?.toJson() ?? {};
      else if (txn.receiver_type === 2)
        txnRes.receiver = usersMap[txn.receiver_id]?.toJson() ?? {};

      txnsRes.push(txnRes);
    });

    return res.status(200).json({
      transactions: txnsRes,
      message: 'Successfully fetched transactions',
      status: 'success',
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
}

/**
 * Get Agents' notifications
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetAgentNotifications(req, res) {
  const { agentId } = req.params;

  // get all the agents' notfications
  let notifications;
  try {
    notifications = await prisma.notifications.findMany({
      where: {
        type: 'agent',
        ref_id: parseInt(agentId, 10),
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res.status(200).json({
    notifications: notifications,
    message: 'Successfully fetched notifications',
    status: 'success',
  });
}

module.exports = {
  handleCreateAccount: handleCreateAgent,
  handleGetAccount: handleGetAgent,
  handleAgentLogin,
  handleForgotPinAgent,
  handleSetNewPinAgent,
  handleGetAgentSecretKey,
  handleGetUsersByAgentId,
  handleGetAgentTransactions,
  handleGetAgentNotifications,
};
