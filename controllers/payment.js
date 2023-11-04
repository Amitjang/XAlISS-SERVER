const StellarSdk = require('stellar-sdk');
const bcrypt = require('bcryptjs');

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

module.exports = { handleSendPayment };
