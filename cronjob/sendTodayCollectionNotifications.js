const {
  startOfDay,
  closestTo,
  isToday,
  isFuture,
  endOfDay,
} = require('date-fns');
const CronJob = require('node-cron');

const prisma = require('../services/prisma');
const { sendNotification } = require('../services/firebase');
const getContractIntervals = require('../utils/getContractIntervals');
const { notifImageURL } = require('../constants');
const saveNotification = require('../utils/saveNotification');

const everyDayScheduler = CronJob.schedule('0 10 * * *', async () => {
  await sendTodayCollectionsNotification();
});

async function sendTodayCollectionsNotification() {
  let collections = [];

  let today = startOfDay(new Date());

  let contracts;
  try {
    contracts = await prisma.contracts.findMany({
      where: { end_date: { gte: today }, is_cancelled: 0 },
    });
  } catch (error) {
    console.error('Error getting contracts: ', error);
  }

  for (const contract of contracts) {
    if (!isFuture(contract.end_date)) continue;

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

    if (!isNextPaymentDateDone.isDone) collections.push(contract);
  }

  for (const collection of collections) {
    const agentFCMData = await getAgentFCMDataById(collection.agent_id);

    const notifData = {
      title: `Today collection of: ${collection.amount}FR`,
      body: `Collect ${collection.amount}FR${
        collection.address ? ` from: ${collection.address}` : ''
      }`,
      imageUrl: notifImageURL,
      contractId: collection.id.toString(),
    };

    if (!agentFCMData.device_token.length && !agentFCMData.device_type.length) {
      console.error({
        agent_id: collection.agent_id,
        error: 'Does not have device_token and device_type',
      });

      continue;
    }

    if (agentFCMData !== null) {
      await sendNotification(
        notifData,
        agentFCMData.device_type,
        agentFCMData.device_token,
        null,
        notifData.title,
        notifData.body
      );
      await saveNotification(
        'agent',
        collection.agent_id,
        notifData.title,
        notifData.body,
        notifData.imageUrl,
        notifData,
        agentFCMData.device_token,
        agentFCMData.device_type,
        null
      );
    }
  }
}

/**
 * Check if payment is not done for the contractId on the date specified
 * @param {Number} contract_id Contract ID
 * @param {Date} date Date
 */
async function isPaymentDone(contract_id, date) {
  // set the date to midnight
  const dateBeforeMidnight = endOfDay(date);

  const txn = await prisma.transactions.findFirst({
    where: {
      contract_id: contract_id,
      created_at: { gte: date, lte: dateBeforeMidnight },
    },
  });

  return { isDone: !!txn, txn: txn };
}

/**
 * Get Agents' FCM Data by ID
 * @param {number} agent_id Id of Agent
 */
async function getAgentFCMDataById(agent_id) {
  return await prisma.agents.findFirst({
    where: { id: agent_id },
    select: { device_token: true, device_type: true },
  });
}

module.exports = { everyDayScheduler };
