// const fetch = require('node-fetch');

const { HttpSms } = require('goip');
const {
  GoIP_URL,
  GoIP_USERNAME,
  GoIP_PASSWORD,
  GoIP_BASE_URL,
} = require('../constants');

/**
 * Send SMS to a phone number
 * @param {string} dialCode Dial Code
 * @param {string} number Phone Number
 */
function sendSMS(dialCode, number, message) {
  const sms = new HttpSms(GoIP_BASE_URL, 3, GoIP_USERNAME, GoIP_PASSWORD);

  const url = new URL(GoIP_URL);

  const phoneNumber = `${dialCode.replace('+', '')}${number}`;

  url.searchParams.append('u', GoIP_USERNAME);
  url.searchParams.append('p', GoIP_PASSWORD);
  url.searchParams.append('l', 3);
  url.searchParams.append('n', phoneNumber);
  url.searchParams.append('m', message);

  console.log({ url: url.toString() });

  return fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Accept: '*/*',
    },
  });

  // return sms.send(phoneNumber, message);
}

module.exports = { sendSMS };
