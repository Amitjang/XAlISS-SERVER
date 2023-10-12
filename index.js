const dotenv = require('dotenv');
const express = require('express');
const morgan = require('morgan');
const StellarSdk = require('stellar-sdk');

dotenv.config();
const app = express();

const PORT = process.env.PORT || 8080;

const nodeEnv = process.env.NODE_ENV;

if (nodeEnv === 'dev') {
  app.use(morgan('short'));
}

const server = new StellarSdk.Server('https://horizon-testnet.stellar.org'); // Replace with your Horizon server URL

app.get('/get-account/:accountId', async (req, res, next) => {
  const accountId = req.params.accountId;

  try {
    if (accountId.trim().length === 0)
      throw new Error('accountId cannot be empty');

    const account = await server.loadAccount(accountId);
    return res
      .status(200)
      .json({ account, message: 'Successfully fetched account' });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err?.message ?? 'Something went wrong!' });
  }
});

app.get('/create-account', async (req, res, next) => {
  // Create a new account
  try {
    const pair = StellarSdk.Keypair.random(); // Generate key pair

    const res = await server.friendbot(pair.publicKey()).call();
    console.log('Account created ✅');
    console.log(res);
  } catch (error) {
    return res.status(500).json({
      message: 'Error while creating account: ' + JSON.stringify(err),
    });
  }

  // try {
  //   const account = await server.loadAccount(pair.publicKey());

  //   const xoftAsset = new StellarSdk.Asset(
  //     'XOFT',
  //     'GBVYATQXS4L45JTAIVRW3AOIJZX2NFGDLRVFGLQLBCBMNAH7Y54SAP44'
  //   ); // Create a trustline to the XOFT token
  //   const transaction = new StellarSdk.TransactionBuilder(account, {
  //     fee: 200,
  //     networkPassphrase: StellarSdk.Networks.TESTNET,
  //   })
  //     .addOperation(
  //       StellarSdk.Operation.changeTrust({
  //         asset: xoftAsset,
  //         limit: '1000', // Set your desired limit
  //       })
  //     )
  //     .setTimeout(500)
  //     .build();

  //   transaction.sign(pair);
  //   await server.submitTransaction(transaction); // Sign the transaction with your secret key

  //   console.log('Trustline created successfully!', result);

  //   return res
  //     .status(201)
  //     .json({ message: 'Account created successfully', account });
  // } catch (err) {
  //   console.error('Error creating trustline:', err);
  //   console.error('Extras:', err?.response?.data?.extras);
  //   return res.status(400).json({
  //     message: 'Error while creating account: ' + JSON.stringify(err),
  //   });
  // }
});

app.listen(PORT, () => {
  console.log(`Serving on http://localhost:${PORT}`);
});
