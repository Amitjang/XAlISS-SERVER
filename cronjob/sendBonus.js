const {
  isLastDayOfMonth,
  startOfMonth,
  endOfMonth,
  endOfDay,
  startOfDay,
  startOfToday,
  addMilliseconds,
} = require('date-fns');
const CronJob = require('node-cron');
const StellarSdk = require('stellar-sdk');

const prisma = require('../services/prisma');
const server = require('../services/stellar');
const { sendNotification } = require('../services/firebase');

const {
  savingFees,
  COMPANY_WALLET_PUBLIC_KEY,
  xoftAsset,
  COMPANY_WALLET_SECRET_KEY,
  notifImageURL,
} = require('../constants');
const saveNotification = require('../utils/saveNotification');

const lastDayOfMonthScheduler = CronJob.schedule('* * 28-31 * *', async () => {
  const today = new Date();
  if (isLastDayOfMonth(today)) {
    await chargeUserFeesAndSendBonusToAgent();
  }
});

async function chargeUserFeesAndSendBonusToAgent() {
  // Get All Active Contracts
  const today = startOfToday();

  const monthStartDate = startOfMonth(today);
  const monthEndDate = addMilliseconds(endOfMonth(today), 1);

  let contracts;
  try {
    contracts = await prisma.contracts.findMany({
      where: { is_cancelled: 0, end_date: { gte: today } },
    });
  } catch (error) {
    console.error('Error getting active contracts:', error);
  }

  for (const contract of contracts) {
    // Get all transactions for the each contract
    let fees, totalAmountFromTxns;
    try {
      const transactions = await getTransactionsForContractId(
        contract.id,
        monthStartDate,
        monthEndDate
      );
      totalAmountFromTxns = transactions.reduce(
        (acc, curr) => acc + curr.amount,
        0
      );
      fees = (totalAmountFromTxns * savingFees[contract.saving_type]) / 100;
      // if saving type is daily, we collect the last day of collection as fees
      if (contract.saving_type.toLowerCase() === 'daily') {
        fees += contract.amount;
      }
    } catch (error) {
      // TODO: handle errors
      console.error('Error getting transactions:', error);
      continue;
    }

    const isFeesCharged = await isFeesChargedForContract(
      contract.id,
      contract.user_id,
      monthEndDate
    );
    if (!isFeesCharged) {
      try {
        const { feesCharged, error } = await chargeUserFees(
          contract.user_id,
          fees
        );

        await upsertFeesHistory(
          contract.id,
          contract.user_id,
          monthEndDate,
          contract.saving_type,
          totalAmountFromTxns,
          fees,
          feesCharged,
          error
        );
      } catch (error) {
        console.error(error);
      }
    }

    const isBonusSent = await isBonusSentForContract(
      contract.id,
      contract.agent_id,
      monthEndDate
    );
    if (!isBonusSent) {
      try {
        const { bonusSent, error } = await sendBonusToAgent(
          contract.agent_id,
          fees
        );

        await upsertBonusHistory(
          contract.id,
          contract.agent_id,
          monthEndDate,
          contract.saving_type,
          totalAmountFromTxns,
          fees,
          bonusSent,
          error
        );
      } catch (error) {
        console.error(error);
      }
    }
  }
}

const chargeUserFees = async (userId, fees) => {
  const state = {
    feesCharged: false,
    error: '',
  };

  let user;
  try {
    user = await getUserById(userId); // Sender of payment
    if (!user) throw new Error(`No user found for id: ${userId}`);
  } catch (error) {
    state.error = `Error getting user by id: ${userId}, ${JSON.stringify(
      error
    )}`;

    return state;
  }

  // get user stellar wallet
  let userWallet;
  try {
    userWallet = await server.loadAccount(user.account_id);
  } catch (error) {
    if (error instanceof StellarSdk.NotFoundError) {
      state.error = `No account found for user with phone number: ${user.dial_code} ${user.phone_number}`;
    } else {
      state.error = JSON.stringify(error);
    }

    return state;
  }

  // Send money from user wallet to company wallet
  const keyPair = StellarSdk.Keypair.fromSecret(user.account_secret);
  try {
    await sendMoney(
      userWallet,
      COMPANY_WALLET_PUBLIC_KEY,
      fees,
      keyPair,
      'Monthly Fees deduction'
    );

    state.feesCharged = true;
  } catch (error) {
    state.error = JSON.stringify(error);
  }

  return state;
};

/**
 * Send Bonus to agent
 * @param {number} agentId Agent ID
 * @param {number} bonus Bonus fees of agent
 */
const sendBonusToAgent = async (agentId, bonus) => {
  const state = { bonusSent: false, error: '' };

  if (bonus <= 0) {
    state.error = 'Bonus cannot be LESS THAN OR EQUAL TO ZERO';
    return state;
  }

  let agent;
  try {
    agent = await getAgentById(agentId); // Sender of payment
    if (!agent) throw new Error(`No agent found for id: ${agentId}`);
  } catch (error) {
    state.error = `Error getting agent by id: ${agentId} ${JSON.stringify(
      error
    )}`;

    return state;
  }

  // if agent does not have a bonus wallet create one
  if (agent.bonus_wallet_public_key.length === 0) {
    const bonusKeyPair = StellarSdk.Keypair.random();

    // Create a bonus wallet
    try {
      await server.friendbot(bonusKeyPair.publicKey()).call();
    } catch (error) {
      state.error = `Error creating bonus wallet for agent: ${
        agent.id
      }, ${JSON.stringify(error)}`;
      return state;
    }

    const bonusWallet = await server.loadAccount(bonusKeyPair.publicKey());

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

    try {
      await prisma.agents.update({
        where: { id: agent.id },
        data: {
          bonus_wallet_public_key: bonusWallet.account_id,
          bonus_wallet_secret_key: bonusKeyPair.secret(),
        },
      });
    } catch (error) {
      state.error = `Error updating agent: ${
        agent.id
      } bonus wallet: ${JSON.stringify(error)}`;

      return state;
    }

    agent.bonus_wallet_public_key = bonusWallet.account_id;
    agent.bonus_wallet_secret_key = bonusKeyPair.secret();
  }

  // get user stellar wallet
  let companyWallet;
  try {
    companyWallet = await server.loadAccount(COMPANY_WALLET_PUBLIC_KEY);
  } catch (error) {
    if (error instanceof StellarSdk.NotFoundError) {
      state.error = `Invalid company wallet public key, no account found`;
    } else {
      state.error = `Error getting company wallet: ${agent.dial_code} ${
        agent.phone_number
      }
        ${JSON.stringify(error?.response?.data?.extras)}`;
    }

    return state;
  }

  // Send money from company wallet to agent wallet
  const keyPair = StellarSdk.Keypair.fromSecret(COMPANY_WALLET_SECRET_KEY);
  try {
    await sendMoney(
      companyWallet,
      agent.bonus_wallet_public_key,
      bonus,
      keyPair,
      'Monthly bonus'
    );

    state.bonusSent = true;
  } catch (err) {
    // error sending money from user wallet to company wallet

    state.error = `Error sending bonus to agent [${agent.id}]: ${JSON.stringify(
      err?.response?.data?.extras
    )}`;

    return state;
  }

  const notifData = {
    title: `Monthly bonus received`,
    body: `${bonus} monthly bonus received for this month.`,
    imageUrl: notifImageURL,
  };
  try {
    await sendNotification(
      notifData,
      agent.device_type,
      agent.device_token,
      null,
      notifData.title,
      notifData.body
    );
  } catch (error) {
    state.error = `Error sending monthly bonus notification to agent [${
      agent.id
    }]:', ${JSON.stringify(error)}`;
    return state;
  }

  try {
    await saveNotification(
      'agent',
      agent.id,
      notifData.title,
      notifData.body,
      notifData.imageUrl,
      notifData,
      agent.device_token,
      agent.device_type,
      null
    );
  } catch (error) {
    state.error = `Error saving monthly bonus notification to agent [${
      agent.id
    }]:', ${JSON.stringify(error)}`;
  }

  return state;
};

const getTransactionsForContractId = (contract_id, start_date, end_date) => {
  const startDateAtMidnight = startOfDay(start_date);
  const endDateBeforeMidnight = endOfDay(end_date);

  return prisma.transactions.findMany({
    where: {
      contract_id: contract_id,
      created_at: { gte: startDateAtMidnight, lte: endDateBeforeMidnight },
    },
  });
};

/**
 * Is Fees Charged for Contract
 * @param {number} contract_id Contract ID
 * @param {number} user_id User ID
 * @param {Date} date Date
 */
const isFeesChargedForContract = async (contract_id, user_id, date) => {
  const feesCharged = await prisma.fees_history.findFirst({
    where: {
      contract_id: contract_id,
      user_id: user_id,
      date: { equals: date },
    },
  });

  return feesCharged ? !!feesCharged.payment_status : false;
};

const isBonusSentForContract = async (contract_id, agent_id, date) => {
  const bonusSent = await prisma.bonus_history.findFirst({
    where: {
      contract_id: contract_id,
      agent_id: agent_id,
      date: date,
    },
  });

  return bonusSent ? !!bonusSent.payment_status : false;
};

const getUserById = userId =>
  prisma.users.findFirst({ where: { id: parseInt(userId, 10) } });

const getAgentById = agentId =>
  prisma.agents.findFirst({ where: { id: parseInt(agentId, 10) } });

/**
 * Send Money
 * @param {StellarSdk.Account} sender Sender Account
 * @param {string} receiver Receiver Account
 * @param {number} amount Amount to send
 * @param {StellarSdk.Keypair} keyPair KeyPair of Sender Account
 * @param {string} memo Memo to add to txn
 * @throws Throws error if amount received is ZERO.
 */
const sendMoney = (sender, receiver, amount, keyPair, memo) => {
  if (amount <= 0) throw new Error(`Amount must be greater than 0`);

  const transaction = new StellarSdk.TransactionBuilder(sender, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: receiver,
        asset: xoftAsset,
        amount: String(amount.toFixed(7)),
      })
    )
    .addMemo(StellarSdk.Memo.text(memo))
    // wait for 1 minute 30 seconds for the transaction
    .setTimeout(90)
    .build();

  transaction.sign(keyPair);

  return server.submitTransaction(transaction);
};

/**
 * Upsert fees history
 * @param {number} contract_id Contract ID
 * @param {number} user_id User ID
 * @param {Date} monthEndDate Last day of month
 * @param {string} saving_type Saving type
 * @param {number} totalAmountFromTxns Total amount from transactions
 * @param {number} fees Fees
 * @param {boolean} isFeesCharged Is fees charged
 * @param {string} error Error if any
 */
async function upsertFeesHistory(
  contract_id,
  user_id,
  monthEndDate,
  saving_type,
  totalAmountFromTxns,
  fees,
  isFeesCharged,
  error
) {
  await prisma.fees_history.upsert({
    where: {
      contract_id_user_id_date: {
        contract_id: contract_id,
        user_id: user_id,
        date: monthEndDate,
      },
    },
    create: {
      contract_id: contract_id,
      user_id: user_id,
      date: monthEndDate,
      error: error.slice(0, 301),
      payment_status: isFeesCharged ? 1 : 0,
      fees_percentage: savingFees[saving_type],
      saving_type: saving_type,
      total_amount: totalAmountFromTxns,
      fees_amount: fees,
    },
    update: {
      payment_status: isFeesCharged ? 1 : 0,
      error: error.slice(0, 301),
    },
  });
}

/**
 * Upsert Bonus History
 * @param {number} contract_id Contract ID
 * @param {number} agent_id Agent ID
 * @param {Date} monthEndDate Month End Date
 * @param {string} saving_type Saving Type
 * @param {number} totalAmountFromTxns Total amount from transactions
 * @param {number} fees Fees
 * @param {boolean} isBonusSent Is the bonus sent
 * @param {string} error Error if any
 */
async function upsertBonusHistory(
  contract_id,
  agent_id,
  monthEndDate,
  saving_type,
  totalAmountFromTxns,
  fees,
  isBonusSent,
  error
) {
  return await prisma.bonus_history.upsert({
    where: {
      contract_id_agent_id_date: {
        contract_id: contract_id,
        agent_id: agent_id,
        date: monthEndDate,
      },
    },
    create: {
      contract_id: contract_id,
      agent_id: agent_id,
      date: monthEndDate,
      error: error.slice(0, 301),
      payment_status: isBonusSent ? 1 : 0,
      bonus_percentage: savingFees[saving_type],
      saving_type: saving_type,
      total_amount: totalAmountFromTxns,
      bonus_amount: fees,
    },
    update: {
      payment_status: isBonusSent ? 1 : 0,
      error: error.slice(0, 301),
    },
  });
}

module.exports = { lastDayOfMonthScheduler };
