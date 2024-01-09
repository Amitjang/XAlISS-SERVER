const fetch = require('node-fetch');

const { SEND_SMS_URL } = require('../constants');

/**
 * Send SMS to a phone number
 * @param {string} dialCode Dial Code
 * @param {string} number Phone Number
 */
function sendSMS(dialCode, number, message) {
  const phoneNumber = `${dialCode.replace('+', '')}${number}`;

  const url = new URL(SEND_SMS_URL);
  url.searchParams.append('number', phoneNumber);
  url.searchParams.append('message', message);

  return fetch(url.toString(), { method: 'GET' });
}

module.exports = { sendSMS };
