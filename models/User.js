const { AccountResponse } = require('stellar-sdk');

class User {
  /**
   * @param {{
   * id: number, agent_id: number, account_id: string, account_secret: string,
   * name: string, dial_code: string, phone_number: string, verification_number: string,
   * address: string, country: string, state: string, city: string, pincode: string, lat: number, lng: number,
   * created_at: Date, updated_at: Date
   *}} user user
   */
  constructor({
    id,
    account_id,
    account_secret,

    name,
    dial_code,
    phone_number,
    verification_number,

    address,
    country,
    state,
    city,
    pincode,
    lat,
    lng,

    created_at,
    updated_at,
  }) {
    this.id = id;
    this.account_id = account_id;
    this.account_secret = account_secret;

    this.name = name;
    this.dial_code = dial_code;
    this.phone_number = phone_number;
    this.verification_number = verification_number;

    this.address = address;
    this.country = country;
    this.state = state;
    this.city = city;
    this.pincode = pincode;
    this.lat = lat;
    this.lng = lng;

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
      name: this.name,
      dial_code: this.dial_code,
      phone_number: this.phone_number,

      address: this.address,
      country: this.country,
      state: this.state,
      city: this.city,
      pincode: this.pincode,
      lat: this.lat,
      lng: this.lng,

      account: this.account,

      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = User;
