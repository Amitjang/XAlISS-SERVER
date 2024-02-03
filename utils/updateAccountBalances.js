const prisma = require('../services/prisma');

/**
 * Update the account balances of the user entities
 * @param {{ senderId: number, recieverId: number, amount: number, senderType: string, recieverType: string }} props Properties to update the account balances of entities
 */
async function updateAccountBalances({
  senderId,
  recieverId,
  amount,
  senderType,
  recieverType,
}) {
  const txns = [];

  if (senderType === 'Agent') {
    txns.push(
      prisma.agents.update({
        where: { id: senderId },
        data: { account_balance: { decrement: amount } },
      })
    );
  } else {
    txns.push(
      prisma.users.update({
        where: { id: recieverId },
        data: { account_balance: { decrement: amount } },
      })
    );
  }

  if (recieverType === 'Agent') {
    txns.push(
      prisma.agents.update({
        where: { id: recieverId },
        data: { account_balance: { increment: amount } },
      })
    );
  } else {
    txns.push(
      prisma.users.update({
        where: { id: recieverId },
        data: { account_balance: { increment: amount } },
      })
    );
  }

  return prisma.$transaction(txns);
}

module.exports = { updateAccountBalances };
