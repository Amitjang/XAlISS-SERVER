class Admin {
  constructor({
    id,
    name,
    dial_code,
    phone_number,
    pin,
    created_at,
    updated_at,
  }) {
    this.id = Number(id);
    this.name = name;
    this.dial_code = dial_code;
    this.phone_number = phone_number;
    this.pin = pin;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  toJSON = () => ({
    id: this.id,
    name: this.name,
    dial_code: this.dial_code,
    phone_number: this.phone_number,
    created_at: this.created_at,
    updated_at: this.updated_at,
  });
}

module.exports = Admin;
