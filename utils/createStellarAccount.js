const {
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  Memo,
} = require('stellar-sdk');

const server = require('../services/stellar');
const { xoftAsset } = require('../constants');

/**
 * @param {"agent" | "user"} accountType Account Type
 * @param {string} sourceAccountPublicKey Source Account Public Key
 * @param {string} sourceAccountSecretKey Source Account Secret Key
 * @param {Keypair} destinationAccountKeyPair Key for account
 */
async function createStellarAccount(
  accountType,
  sourceAccountPublicKey,
  sourceAccountSecretKey,
  destinationAccountKeyPair
) {
  let startingBalance = accountType === 'agent' ? 3 : 2;
  const sourceAccount = await getStellarAccount(sourceAccountPublicKey);
  const sourceAccountKeyPair = Keypair.fromSecret(sourceAccountSecretKey);

  const txn = new TransactionBuilder(sourceAccount, {
    fee: '100000',
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      Operation.createAccount({
        destination: destinationAccountKeyPair.publicKey(),
        startingBalance: startingBalance.toFixed(7).toString(),
        source: sourceAccountPublicKey,
      })
    )
    .addMemo(Memo.text('Created account'))
    .addOperation(
      Operation.changeTrust({
        asset: xoftAsset,
        source: destinationAccountKeyPair.publicKey(),
      })
    )
    .addMemo(Memo.text('Created XOFT Trustline'))
    .setTimeout(60)
    .build();

  txn.sign(sourceAccountKeyPair, destinationAccountKeyPair);

  await server.submitTransaction(txn);
}

/**
 *
 * @param {string} accountPublicKey Account Public Key
 */
function getStellarAccount(accountPublicKey) {
  return server.loadAccount(accountPublicKey);
}

module.exports = { createStellarAccount, getStellarAccount };
