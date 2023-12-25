const StellarSdk = require('stellar-sdk');

const server = new StellarSdk.Server('https://horizon.stellar.org/'); // Replace with your Horizon server URL

module.exports = server;
