const StellarSdk = require('stellar-sdk');
const bcrypt = require('bcryptjs');

const server = require('../services/stellar');
const prisma = require('../services/prisma');

const CustomError = require('../utils/CustomError');

const Agent = require('../models/Agent');

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
      },
    });

    const agentRes = new Agent(agent);

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

    const account = await server.loadAccount(agent.account_id);

    const agentRes = new Agent(agent);
    agentRes.addAccountDetails(account);

    return res.status(200).json({
      message: 'Successfully fetched account',
      agent: agentRes.toJson(),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err?.message ?? 'Something went wrong!' });
  }
}

async function handleAgentLogin(req, res) {
  const { dialCode, phoneNumber, pin } = req.body;

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

    const agentRes = new Agent(agent);
    agentRes.addAccountDetails(account);

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

module.exports = {
  handleCreateAccount: handleCreateAgent,
  handleGetAccount: handleGetAgent,
  handleAgentLogin,
};
