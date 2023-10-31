const z = require('zod');

const { phoneNumberValidator } = require('../constants');

const createUserSchema = z.object({
  body: z
    .object({
      agentId: z
        .number({
          coerce: true,
          invalid_type_error: 'agentId must be a number',
          required_error: 'agentId is required',
        })
        .int('agentId must be an integer')
        .positive('agentId must be a positive integer'),
      name: z
        .string({
          invalid_type_error: 'name must be a string',
          required_error: 'name is required',
        })
        .trim()
        .min(1, 'name cannot be empty'),
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
      verificationNumber: z
        .string({
          invalid_type_error: 'verificationNumber must be a string',
          required_error: 'verificationNumber is required',
        })
        .trim()
        .min(1, 'verificationNumber cannot be empty'),

      address: z
        .string({
          invalid_type_error: 'address must be a string',
          required_error: 'address is required',
        })
        .trim()
        .min(1, 'address cannot be empty'),
      country: z
        .string({
          invalid_type_error: 'country must be a string',
          required_error: 'country is required',
        })
        .trim()
        .min(1, 'country cannot be empty'),
      state: z
        .string({
          invalid_type_error: 'state must be a string',
          required_error: 'state is required',
        })
        .optional(),
      city: z
        .string({
          invalid_type_error: 'city must be a string',
          required_error: 'city is required',
        })
        .optional(),
      pincode: z
        .string({
          invalid_type_error: 'pincode must be a string',
          required_error: 'pincode is required',
        })
        .trim()
        .min(1, 'pincode cannot be empty'),
      lat: z.number({
        coerce: true,
        invalid_type_error: 'lat must be a float',
        required_error: 'lat is required',
      }),
      lng: z.number({
        coerce: true,
        invalid_type_error: 'lng must be a float',
        required_error: 'lng is required',
      }),
    })
    .refine(phoneNumberValidator, { message: 'phoneNumber is invalid' }),
});

const getUserSchema = z.object({
  params: z.object({
    userId: z.coerce.number({
      invalid_type_error: 'userId must be a number',
      required_error: 'userId is required',
    }),
  }),
});

module.exports = { createUserSchema, getUserSchema };
