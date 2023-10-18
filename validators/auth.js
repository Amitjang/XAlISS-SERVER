const z = require('zod');

const pinRegex = /^[0-9]+$/;

const loginSchema = z.object({
  body: z.object({
    dialCode: z
      .string({
        invalid_type_error: 'dialCode must be a string',
        required_error: 'dialCode is required',
      })
      .trim()
      .min(1, 'dialCode cannot be empty'),
    phoneNumber: z
      .string({
        invalid_type_error: 'phoneNumber must be a string',
        required_error: 'phoneNumber is required',
      })
      .trim()
      .min(10, 'phoneNumber must be 10 characters long')
      .max(10, 'phoneNumber must be 10 characters long'),
    pin: z
      .string({
        invalid_type_error: 'pin must be a string',
        required_error: 'pin is required',
      })
      .trim()
      .min(1, 'pin cannot be empty')
      .regex(pinRegex, 'pin must only contain numbers')
      .min(4, 'pin must be 4 characters long')
      .max(4, 'pin must be 4 characters long'),
  }),
});

module.exports = { loginSchema };
