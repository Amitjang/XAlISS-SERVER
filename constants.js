const { parsePhoneNumber } = require('libphonenumber-js');
const StellarSdk = require('stellar-sdk');
const { addMonths, addYears } = require('date-fns');

const pinRegex = /^[0-9]+$/;
const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;

const phoneNumberValidator = ({ dialCode, phoneNumber }) => {
  const dialCodeWithPlusSign = `+${dialCode.replace('+', '')}`;
  const phone = parsePhoneNumber(`${dialCodeWithPlusSign}${phoneNumber}`);
  return phone.isValid();
};

const userTypes = {
  Admin: 0,
  Agent: 1,
  User: 2,
};
const USER_TYPES = Object.keys(userTypes);

const CONTRACT_TYPES = [
  'daily-1-month',
  'daily-3-month',
  'monthly-3-month',
  'monthly-6-month',
  'monthly-1-year',
  'weekly-1-month',
  'weekly-3-month',
  'weekly-6-month',
  'weekly-1-year',
];

/**
 * @param {string} contractType Contract Type
 * @param {Date} firstPaymentDate First Payment Date
 */
const getEndDateForContractType = (
  contractType,
  firstPaymentDate = new Date()
) => {
  let date = firstPaymentDate;

  switch (contractType) {
    case 'daily-1-month':
    case 'weekly-1-month':
      date = addMonths(date, 1);
      break;
    case 'daily-3-month':
    case 'weekly-3-month':
    case 'monthly-3-month':
      date = addMonths(date, 3);
      break;
    case 'monthly-6-Month':
      date = addMonths(date, 6);
      break;
    case 'weekly-1-year':
    case 'monthly-1-year':
      date = addYears(date, 1);
      break;
    default:
      break;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

/**
 * Get the saving type and withdrawal time
 * @param {string} contractType Contract Type
 */
const getSavingAndWithdrawTypeForContractType = contractType => {
  const contract_type = contractType.toLowerCase();
  let saving_type = '';
  let withdraw_time = '';

  const regex = /^(\w+)-(.+)$/;

  const res = contract_type.match(regex);
  if (res && res.length >= 2) {
    saving_type = res[1];
    withdraw_time = res[2];
  }

  return { saving_type: saving_type, withdraw_time: withdraw_time };
};

const xoftAsset = new StellarSdk.Asset('XOFT', process.env.ISSUER_TOKEN); // Create a trustline to the XOFT token

module.exports = {
  pinRegex,
  dobRegex,
  phoneNumberValidator,
  USER_TYPES,
  userTypes,
  CONTRACT_TYPES,
  getEndDateForContractType,
  getSavingAndWithdrawTypeForContractType,
  xoftAsset,
};
