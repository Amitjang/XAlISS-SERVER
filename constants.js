const { parsePhoneNumber } = require('libphonenumber-js');

const pinRegex = /^[0-9]+$/;
const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;

const phoneNumberValidator = data => {
  const phoneNumber = parsePhoneNumber(`${data.dialCode}${data.phoneNumber}`);
  return phoneNumber.isValid();
};

module.exports = {
  pinRegex,
  dobRegex,
  phoneNumberValidator,
};
