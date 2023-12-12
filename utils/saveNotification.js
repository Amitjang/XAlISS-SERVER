const prisma = require('../services/prisma');

/**
 * Save notification to db
 * @param {"agent" | "user" | "admin"} type Type of entity
 * @param {number} ref_id Reference id of entity
 * @param {string} title Title of notification
 * @param {string} body Body of notification
 * @param {string} imageUrl Image of notification
 * @param {any} data Data object of notification
 * @param {string} device_token Device token
 * @param {string} device_type Device type
 * @param {string | null} topic Topic of notification
 */
const saveNotification = async (
  type,
  ref_id,
  title,
  body,
  imageUrl = '',
  data,
  device_token,
  device_type,
  topic = null
) => {
  return prisma.notifications.create({
    data: {
      type: type,
      ref_id: ref_id,
      title: title,
      body: body,
      imageUrl: imageUrl,
      data: JSON.stringify(data),
      device_token: device_token,
      device_type: device_type,
      topic: topic,
    },
  });
};

module.exports = saveNotification;
