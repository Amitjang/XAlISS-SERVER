const StellarSdk = require('stellar-sdk');
const bcrypt = require('bcryptjs');
const { request, response } = require('express');
const { isToday, closestTo, isFuture, set } = require('date-fns');

const prisma = require('../services/prisma');
const server = require('../services/stellar');

const CustomError = require('../utils/CustomError');
const { xoftAsset, userTypes } = require('../constants');
const getContractIntervals = require('../utils/getContractIntervals');

async function handleSendPayment(req, res) {
  const {
    senderDialCode,
    senderPhoneNumber,
    senderTransactionPin,
    receiverDialCode,
    receiverPhoneNumber,
    amount,
    purpose,
    contractId,
  } = req.body;

  console.log(purpose);

  const senderAndReceiverType = {
    sender: 'Agent',
    receiver: 'User',
  };
  let sender, receiver;
  try {
    // check if sender is an agent
    sender = await prisma.agents.findFirst({
      where: {
        dial_code: senderDialCode.trim(),
        phone_number: senderPhoneNumber.trim(),
      },
    });
    if (!sender) {
      // if sender is not an agent
      // check if sender is a user
      /*
        const userSender = await prisma.users.findFirst({
          where: {
            dial_code: senderDialCode.trim(),
            phone_number: senderPhoneNumber.trim(),
          },
        });
      */

      // if no sender is found in user
      /* if (!userSender) */
      throw new CustomError({
        code: 404,
        message: `No user found with phone number: +${senderDialCode.replace(
          '+',
          ''
        )} ${senderPhoneNumber}`,
      });

      /* sender = userSender; */
    }

    if (sender.account_secret.trim().length === 0) {
      throw new CustomError({
        code: 400,
        message: 'sender does not have a secret key 🥲',
      });
    }

    // check if receiver is a user
    receiver = await prisma.users.findFirst({
      where: {
        dial_code: receiverDialCode.trim(),
        phone_number: receiverPhoneNumber.trim(),
      },
    });
    // if receiver is not user
    if (!receiver) {
      // check if receiver is agent
      const agentReceiver = await prisma.agents.findFirst({
        where: {
          dial_code: receiverDialCode.trim(),
          phone_number: receiverPhoneNumber.trim(),
        },
      });
      // if reciever is not an agent as well
      // throw error
      if (!agentReceiver) {
        throw new CustomError({
          code: 404,
          message: `No receiver found with phone number: +${receiverDialCode.replace(
            '+',
            ''
          )} ${receiverPhoneNumber}`,
        });
      }
      receiver = agentReceiver;
      senderAndReceiverType.receiver = 'Agent';
    }
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
  const txn = {
    contract_id: null,
    amount: parseFloat(amount?.toFixed(7)),
    sender_id: sender.id,
    sender_type: userTypes[senderAndReceiverType.sender],
    receiver_id: receiver.id,
    receiver_type: userTypes[senderAndReceiverType.receiver],
  };
  /*
   / if the receiver is a user && contract id is present
   / get the contract, calculate the intervals, get closest date
   / if today is day for collection, save the contract_id in txn
   / else normal txn
   */
  if (
    senderAndReceiverType.receiver === 'User' &&
    contractId !== undefined &&
    contractId !== null
  ) {
    try {
      const contract = await prisma.contracts.findFirst({
        where: { id: parseInt(contractId, 10) },
      });
      if (!contract)
        throw new CustomError({
          code: 404,
          message: `No contract found for contract id ${contractId}`,
        });

      if (contract.user_id !== receiver.id) {
        throw new CustomError({
          code: 409,
          message: 'Invalid contractId, does not belong the same user',
        });
      }

      const intervals = getContractIntervals(
        contract.saving_type,
        contract.first_payment_date,
        contract.end_date
      );

      const today = new Date();
      today.setHours(0, 0, 0);

      const nextPaymentDate = closestTo(today, intervals);

      if (isToday(nextPaymentDate)) {
        const { isDone } = await isPaymentDone(contract.id, nextPaymentDate);
        if (isDone)
          throw new CustomError({
            code: 400,
            message: `Already paid for ${nextPaymentDate.toLocaleDateString()} collection`,
          });
        else txn.contract_id = contract.id;
      }
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
    await server.submitTransaction(transaction);

    // store the transaction details
    await prisma.transactions.create({
      data: txn,
    });

    return res.status(201).json({ message: 'Success', status: 'success' });
  } catch (error) {
    console.error('Something went wrong!', error);
    return res.status(500).json({
      message: error.message,
      status: 'error',
      extras: error?.response?.data?.extras,
    });
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
      where: { agent_id: agent.id, end_date: { gte: today }, is_cancelled: 0 },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  for (const contract of contracts) {
    if (!isFuture(contract.end_date)) return;

    const intervals = getContractIntervals(
      contract.saving_type,
      contract.first_payment_date,
      contract.end_date
    );

    const nextPaymentDate = closestTo(today, intervals);
    if (!isToday(nextPaymentDate)) continue;

    const isNextPaymentDateDone = await isPaymentDone(
      contract.id,
      nextPaymentDate
    );

    console.log(isNextPaymentDateDone);
    if (!isNextPaymentDateDone.isDone) collections.push(contract);
  }

  return res
    .status(200)
    .json({ collections, message: 'Success', status: 'success' });
}

/**
 * Check if payment is not done for the contractId on the date specified
 * @param {Number} contract_id Contract ID
 * @param {Date} date Date
 */
async function isPaymentDone(contract_id, date) {
  // set the date to midnight
  const dateBeforeMidnight = set(date, { hours: 23, minutes: 59, seconds: 59 });

  const txn = await prisma.transactions.findFirst({
    where: {
      contract_id: contract_id,
      created_at: { gte: date, lte: dateBeforeMidnight },
    },
  });

  return { isDone: !!txn, txn: txn };
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
