const StellarSdk = require('stellar-sdk');
const bcrypt = require('bcryptjs');
const { request, response } = require('express');
const {
  isToday,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  closestTo,
  getDay,
  isFuture,
} = require('date-fns');

const prisma = require('../services/prisma');
const server = require('../services/stellar');

const CustomError = require('../utils/CustomError');
const { xoftAsset } = require('../constants');

async function handleSendPayment(req, res) {
  const {
    senderDialCode,
    senderPhoneNumber,
    senderTransactionPin,
    receiverDialCode,
    receiverPhoneNumber,
    amount,
    purpose,
  } = req.body;

  console.log(purpose);

  let sender, receiver;
  try {
    sender = await prisma.agents.findFirst({
      where: {
        dial_code: senderDialCode.trim(),
        phone_number: senderPhoneNumber.trim(),
      },
    });
    if (!sender)
      throw new CustomError({
        code: 404,
        message: `No agent found with phone number: +${senderDialCode.replace(
          '+',
          ''
        )} ${senderPhoneNumber}`,
      });

    if (sender.account_secret.trim().length === 0) {
      throw new CustomError({
        code: 400,
        message: 'sender does not have a secret key 🥲',
      });
    }

    receiver = await prisma.users.findFirst({
      where: {
        dial_code: receiverDialCode.trim(),
        phone_number: receiverPhoneNumber.trim(),
      },
    });
    if (!receiver)
      throw new CustomError({
        code: 404,
        message: `No receiver found with phone number: +${receiverDialCode.replace(
          '+',
          ''
        )} ${receiverPhoneNumber}`,
      });
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res
        .status(500)
        .json({ message: 'Error finding sender: ' + error, status: 'error' });
    }
  }

  let senderAcc;
  try {
    senderAcc = await server.loadAccount(sender.account_id);
  } catch (err) {
    if (err instanceof StellarSdk.NotFoundError) {
      return res.status(500).json({
        message: 'The sender account does not exist!',
        status: 'error',
      });
    } else
      return res.status(500).json({
        message: 'Error getting sender account: ' + err,
        status: 'error',
      });
  }

  // check if transaction pin matches
  const doesTransactionPinMatch = await bcrypt.compare(
    senderTransactionPin,
    sender.transaction_pin
  );
  if (!doesTransactionPinMatch)
    return res
      .status(400)
      .json({ message: 'Invalid transaction pin 🗝️', status: 'error' });

  const senderBalance = senderAcc.balances.find(
    el => el.asset_code === 'XOFT'
  ).balance;
  if (parseFloat(senderBalance) < amount.toFixed(7))
    return res.status(400).json({
      balance: parseFloat(senderBalance),
      message: "You don't have enough balance to make a transaction",
      status: 'error',
    });

  const keyPair = StellarSdk.Keypair.fromSecret(sender.account_secret);

  // Start building the transaction.
  try {
    const transaction = new StellarSdk.TransactionBuilder(senderAcc, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: receiver.account_id,
          asset: xoftAsset,
          amount: String(amount?.toFixed(7)),
        })
      )
      .addMemo(StellarSdk.Memo.text('Test Transaction'))
      .setTimeout(60)
      .build();

    // Sign the transaction to prove you are actually the person sending it.
    transaction.sign(keyPair);

    // And finally, send it off to Stellar!
    const result = await server.submitTransaction(transaction);
    console.log('Success! Results:', result);
    return res.status(201).json({ message: 'Success', status: 'success' });
  } catch (error) {
    console.error('Something went wrong!', error);
    return res.status(500).json({ message: error, status: 'error' });
    // If the result is unknown (no response body, timeout etc.) we simply resubmit
    // already built transaction:
    // server.submitTransaction(transaction);
  }
}

/**
 * Get Today's collections, the agent has to collect
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleGetTodayPendingCollections(req, res) {
  const { dialCode, phoneNumber } = req.query;

  let collections = [];
  let contracts;
  let today = new Date();
  today.setHours(0, 0, 0);

  let agent;
  try {
    agent = await prisma.agents.findFirst({
      where: {
        dial_code: `+${dialCode.trim().replace('+', '')}`,
        phone_number: phoneNumber.trim(),
      },
    });
    if (!agent)
      throw new CustomError({
        code: 404,
        message: `No agent found for phone number: +${dialCode
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

  try {
    contracts = await prisma.contracts.findMany({
      where: { agent_id: agent.id, end_date: { gte: today } },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  contracts.forEach(contract => {
    if (!isFuture(contract.end_date)) return;

    if (contract.saving_type === 'daily') {
      const dailyIntervals = eachDayOfInterval({
        start: contract.first_payment_date,
        end: contract.end_date,
      });
      const nextPaymentDate = closestTo(today, dailyIntervals);

      if (isToday(nextPaymentDate)) collections.push(contract);
    } else if (contract.saving_type === 'weekly') {
      const weekIntervals = eachWeekOfInterval(
        {
          start: contract.first_payment_date,
          end: contract.end_date,
        },
        { weekStartsOn: getDay(contract.first_payment_date) }
      );
      const nextPaymentDate = closestTo(today, weekIntervals);

      if (isToday(nextPaymentDate)) contracts.push(contract);
    } else if (contract.saving_type === 'monthly') {
      const monthlyIntervals = eachMonthOfInterval({
        start: contract.first_payment_date,
        end: contract.end_date,
      });
      const nextPaymentDate = closestTo(today, monthlyIntervals);

      if (isToday(nextPaymentDate)) collections.push(contract);
    }
  });

  return res
    .status(200)
    .json({ collections, message: 'Success', status: 'success' });
}

/**
 * Send Payment from one agent to another
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleSendPaymentToAgent(req, res) {
  const {
    senderDialCode,
    senderPhoneNumber,
    senderTransactionPin,
    receiverDialCode,
    receiverPhoneNumber,
    amount,
    purpose,
  } = req.body;

  let sender, receiver;
  try {
    sender = await prisma.agents.findFirst({
      where: {
        dial_code: senderDialCode.trim(),
        phone_number: senderPhoneNumber.trim(),
      },
    });
    if (!sender)
      throw new CustomError({
        code: 404,
        message: `No agent found with phone number: +${senderDialCode.replace(
          '+',
          ''
        )} ${senderPhoneNumber}`,
      });

    if (sender.account_secret.trim().length === 0) {
      throw new CustomError({
        code: 400,
        message: 'sender does not have a secret key 🥲',
      });
    }

    receiver = await prisma.agents.findFirst({
      where: {
        dial_code: receiverDialCode.trim(),
        phone_number: receiverPhoneNumber.trim(),
      },
    });
    if (!receiver)
      throw new CustomError({
        code: 404,
        message: `No receiver found with phone number: +${receiverDialCode.replace(
          '+',
          ''
        )} ${receiverPhoneNumber}`,
      });
  } catch (error) {
    if (error instanceof CustomError) {
      return res
        .status(error.code)
        .json({ message: error.message, status: 'error' });
    } else {
      return res
        .status(500)
        .json({ message: 'Error finding sender: ' + error, status: 'error' });
    }
  }

  let senderAcc;
  try {
    senderAcc = await server.loadAccount(sender.account_id);
  } catch (err) {
    if (err instanceof StellarSdk.NotFoundError) {
      return res.status(500).json({
        message: 'The sender account does not exist!',
        status: 'error',
      });
    } else
      return res.status(500).json({
        message: 'Error getting sender account: ' + err,
        status: 'error',
      });
  }

  // check if transaction pin matches
  const doesTransactionPinMatch = await bcrypt.compare(
    senderTransactionPin,
    sender.transaction_pin
  );
  if (!doesTransactionPinMatch)
    return res
      .status(400)
      .json({ message: 'Invalid transaction pin 🗝️', status: 'error' });

  const senderBalance = senderAcc.balances.find(
    el => el.asset_code === 'XOFT'
  ).balance;
  if (parseFloat(senderBalance) < amount.toFixed(7))
    return res.status(400).json({
      balance: parseFloat(senderBalance),
      message: "You don't have enough balance to make a transaction",
      status: 'error',
    });

  const keyPair = StellarSdk.Keypair.fromSecret(sender.account_secret);

  try {
    const transaction = new StellarSdk.TransactionBuilder(senderAcc, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: receiver.account_id,
          asset: xoftAsset,
          amount: String(amount?.toFixed(7)),
        })
      )
      .addMemo(StellarSdk.Memo.text('Test Transaction'))
      .setTimeout(60)
      .build();

    transaction.sign(keyPair);

    const result = await server.submitTransaction(transaction);

    console.log(result);
  } catch (error) {
    console.log(error?.response?.data?.extras);
    return res.status(500).json({ message: error, status: 'error' });
  }

  // TODO: save transaction in DB

  return res.status(201).json({ message: 'Success', status: 'success' });
}

module.exports = {
  handleSendPayment,
  handleGetTodayPendingCollections,
  handleSendPaymentToAgent,
};
