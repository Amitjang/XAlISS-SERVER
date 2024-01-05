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

const savingFees = {
  daily: 3.5,
  weekly: 3.0,
  monthly: 3.0,
};

const COMPANY_WALLET_PUBLIC_KEY = process.env.COMPANY_WALLET_PUBLIC_KEY;
const COMPANY_WALLET_SECRET_KEY = process.env.COMPANY_WALLET_SECRET_KEY;

const CREATE_ACCOUNT_PUBLIC_KEY = process.env.CREATE_ACCOUNT_PUBLIC_KEY;
const CREATE_ACCOUNT_SECRET_KEY = process.env.CREATE_ACCOUNT_SECRET_KEY;

const notifImageURL =
  'https://firebasestorage.googleapis.com/v0/b/xaliss-agent-app.appspot.com/o/ic_launcher_android.png?alt=media&token=f9402d34-dcfd-40e9-9b90-a43d59e979b2';

const GoIP_BASE_URL = process.env.GoIP_BASE_URL;
const GoIP_URL = process.env.GoIP_URL;
const GoIP_USERNAME = process.env.GoIP_USERNAME;
const GoIP_PASSWORD = process.env.GoIP_PASSWORD;

module.exports = {
  pinRegex,
  dobRegex,
  phoneNumberValidator,
  userTypes,
  CONTRACT_TYPES,
  getEndDateForContractType,
  getSavingAndWithdrawTypeForContractType,
  xoftAsset,
  savingFees,
  COMPANY_WALLET_PUBLIC_KEY,
  COMPANY_WALLET_SECRET_KEY,
  notifImageURL,

  CREATE_ACCOUNT_PUBLIC_KEY,
  CREATE_ACCOUNT_SECRET_KEY,

  GoIP_BASE_URL,
  GoIP_URL,
  GoIP_USERNAME,
  GoIP_PASSWORD,
};
