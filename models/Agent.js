const { AccountResponse } = require('stellar-sdk');

class Agent {
  /**
   * @param {{ id: number, phone_number: string, dial_code: string, name: string, email: string, country: string, state: string, city: string, pincode: string, lat: number, lng: number, verification_number: string, date_of_birth: string, transaction_pin: string, created_at: Date, updated_at: Date, }} agent agent
   */
  constructor({
    id,
    account_id,
    account_secret,
    dial_code,
    phone_number,
    name,
    email,
    address,
    country,
    state,
    city,
    pincode,
    lat,
    lng,
    pin,
    gender,
    occupation,
    relative_dial_code,
    relative_phone_number,
    verification_number,
    date_of_birth,
    transaction_pin,
    created_at,
    updated_at,
  }) {
    this.id = id;
    this.account_id = account_id;
    this.account_secret = account_secret;
    this.phone_number = phone_number;
    this.dial_code = dial_code;
    this.name = name;
    this.email = email;
    this.address = address;
    this.country = country;
    this.state = state;
    this.city = city;
    this.pincode = pincode;
    this.lat = lat;
    this.lng = lng;
    this.pin = pin;
    this.gender = gender;
    this.occupation = occupation;
    this.relative_dial_code = relative_dial_code;
    this.relative_phone_number = relative_phone_number;
    this.verification_number = verification_number;
    this.date_of_birth = date_of_birth;
    this.transaction_pin = transaction_pin;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  /**
   * @param {AccountResponse} accountDetails account details
   */
  addAccountDetails({ balances, account_id, ...rest }) {
    this.account = {
      account_id: account_id,
      balances: balances,
    };
  }

  toJson() {
    return {
      id: this.id,
      phone_number: this.phone_number,
      dial_code: this.dial_code,
      name: this.name,
      email: this.email,
      address: this.address,
      country: this.country,
      state: this.state,
      city: this.city,
      pincode: this.pincode,
      lat: this.lat,
      lng: this.lng,
      gender: this.gender,
      occupation: this.occupation,
      relative_dial_code: this.relative_dial_code,
      relative_phone_number: this.relative_phone_number,
      date_of_birth: this.date_of_birth,
      account: this.account,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Agent;
