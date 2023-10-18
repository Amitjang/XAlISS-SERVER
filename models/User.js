class User {
  /**
   * @param {{ id: number, phone_number: string, dial_code: string, name: string, country: string, state: string, city: string, pincode: string, lat: number, lng: number, created_at: Date, updated_at: Date }} user user
   */
  constructor({
    id,
    phone_number,
    dial_code,
    name,
    country,
    state,
    city,
    pincode,
    lat,
    lng,
    created_at,
    updated_at,
  }) {
    console.log('id:', id);

    this.id = id;
    this.phone_number = phone_number;
    this.dial_code = dial_code;
    this.name = name;
    this.country = country;
    this.state = state;
    this.city = city;
    this.pincode = pincode;
    this.lat = lat;
    this.lng = lng;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  toJson() {
    return {
      id: this.id,
      phone_number: this.phone_number,
      dial_code: this.dial_code,
      name: this.name,
      country: this.country,
      state: this.state,
      city: this.city,
      pincode: this.pincode,
      lat: this.lat,
      lng: this.lng,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = User;
