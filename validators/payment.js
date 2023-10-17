const z = require('zod');

const sendPaymentSchema = z.object({
  body: z.object({
    senderId: z.number({
      invalid_type_error: 'senderId must be a number',
      required_error: 'senderId is required',
    }),
    receiverId: z.number({
      invalid_type_error: 'receiverId must be a number',
      required_error: 'receiverId is required',
    }),
    amount: z
      .number({
        invalid_type_error: 'amount must be a number',
        required_error: 'amount is required',
      })
      .positive('amount can only be positive'),
  }),
});

module.exports = { sendPaymentSchema };
