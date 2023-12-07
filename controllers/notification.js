const { request, response } = require('express');
const prisma = require('../services/prisma');
const CustomError = require('../utils/CustomError');
const { sendNotification } = require('../services/firebase');
const saveNotification = require('../utils/saveNotification');

/**
 * Send Notification
 * @param {request} req Request
 * @param {response} res Response
 */
async function handleSendNotification(req, res) {
  const { type, refId, token, topic, title, body, data } = req.body;
  let deviceType = 'android';

  const isTokenPresent = token !== undefined && token !== null;
  const isTopicPresent = topic !== undefined && topic !== null;
  const isTypePresent = type !== undefined && type !== null && type.length > 0;
  const isRefIDPresent =
    refId !== undefined && refId !== null && refId.length > 0;

  try {
    if (!isTokenPresent && !isTopicPresent)
      throw new CustomError({
        code: 400,
        message: 'Must specify either token | topic',
      });

    if (isTokenPresent && (!isTypePresent || !isRefIDPresent))
      throw new CustomError({
        code: 400,
        message:
          'Must send "type" and "refId" in req body, when sending notification to a token',
      });

    // we will check for entity in db
    // if we are sending notification to a token
    if (type === 'agent') {
      const agent = await prisma.agents.findFirst({
        where: { id: parseInt(refId, 10) },
      });
      if (!agent)
        throw new CustomError({
          code: 404,
          message: `No agent found for id: ${refId}`,
        });
    } else if (type === 'user') {
      const user = await prisma.users.findFirst({
        where: { id: parseInt(refId, 10) },
      });
      if (!user)
        throw new CustomError({
          code: 404,
          message: `No user found for id: ${refId}`,
        });
    } else {
      // TODO: fix for admin
    }
  } catch (error) {
    if (error instanceof CustomError)
      return res.status(error.code).json({
        message: error.message,
        status: 'error',
      });
    else
      return res.status(500).json({
        message: error?.message ?? 'Something went wrong!',
        status: 'error',
      });
  }

  try {
    await sendNotification(data, deviceType, token, topic, title, body);
    await saveNotification(
      type,
      parseInt(refId, 10),
      title,
      body,
      data,
      token,
      deviceType,
      topic
    );
  } catch (error) {
    return res.status(500).json({
      message: error?.message ?? 'Something went wrong!',
      status: 'error',
    });
  }

  return res
    .status(200)
    .json({ message: 'Successfully sent notification', status: 'success' });
}

module.exports = { handleSendNotification };
