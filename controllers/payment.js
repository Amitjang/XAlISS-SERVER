const StellarSdk = require('stellar-sdk');

const prisma = require('../services/prisma');
const server = require('../services/stellar');

const CustomError = require('../utils/CustomError');

async function handleSendPayment(req, res) {
  const { senderId, receiverId, amount } = req.body;

  let sender, receiver;
  try {
    sender = await prisma.users.findFirst({ where: { id: senderId } });
    if (!sender)
      throw new CustomError({
        code: 404,
        message: `No sender found with id: ${senderId}`,
      });

    if (sender.account_secret.trim().length === 0) {
      throw new CustomError({
        code: 400,
        message: 'sender does not have a secret key 🥲',
      });
    }

    receiver = await prisma.users.findFirst({
      where: { id: receiverId },
    });
    if (!receiver)
      throw new CustomError({
        code: 404,
        message: `No receiver found with id: ${receiverId}`,
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
        message: 'The destination account does not exist!',
        status: 'error',
      });
    } else
      return res.status(500).json({
        message: 'Error getting sender account: ' + err,
        status: 'error',
      });
  }

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
          asset: StellarSdk.Asset.native(),
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
    return res.status(201).json({ message: '', status: 'success' });
  } catch (error) {
    console.error('Something went wrong!', error);
    return res.status(500).json({ message: error, status: 'error' });
    // If the result is unknown (no response body, timeout etc.) we simply resubmit
    // already built transaction:
    // server.submitTransaction(transaction);
  }
}

module.exports = { handleSendPayment };
