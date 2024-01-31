const z = require('zod');

const { pinRegex, phoneNumberValidator } = require('../constants');

const loginAdminSchema = z.object({
  body: z
    .object({
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
        .min(1, 'phoneNumber cannot be empty'),
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
      deviceToken: z
        .string({ invalid_type_error: 'deviceToken must be a string' })
        .min(1, 'deviceToken cannot be empty')
        .nullish(),
      deviceType: z
        .string({ invalid_type_error: 'deviceType must be a string' })
        .min(1, 'deviceType cannot be empty')
        .nullish(),
    })
    .refine(
      val =>
        phoneNumberValidator({
          dialCode: val.dialCode,
          phoneNumber: val.phoneNumber,
        }),
      { message: 'phoneNumber is invalid' }
    ),
});

module.exports = { loginAdminSchema };
