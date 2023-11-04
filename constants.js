const { parsePhoneNumber } = require('libphonenumber-js');
const StellarSdk = require('stellar-sdk');
const { addMonths, addYears } = require('date-fns');

const pinRegex = /^[0-9]+$/;
const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;

const phoneNumberValidator = ({ dialCode, phoneNumber }) => {
  const phone = parsePhoneNumber(`${dialCode}${phoneNumber}`);
  return phone.isValid();
};

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
 * Get the end date for the contract period
 * @param {string} contractType Type of Contract
 * @param {Date | null} firstPaymentDate Date for the first payment
 */
const getEndDateForContractType = (contractType, firstPaymentDate) => {
  let today = new Date();

  switch (contractType) {
    case 'daily-1-month':
      today = addMonths(today, 1);
      break;
    case 'daily-3-month':
    case 'weekly-3-month':
    case 'monthly-3-month':
      today = addMonths(today, 3);
      break;
    case 'monthly-6-Month':
      today = addMonths(today, 6);
      break;
    case 'weekly-1-year':
    case 'monthly-1-year':
      today = addYears(today, 1);
      break;
    default:
      break;
  }

  today.setHours(0, 0, 0, 0);

  return today;
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
  CONTRACT_TYPES,
  getEndDateForContractType,
  getSavingAndWithdrawTypeForContractType,
  xoftAsset,
};
