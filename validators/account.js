const z = require('zod');

const createAccountSchema = z.object({
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
      .min(10, 'phoneNumber must be 10 characters only')
      .max(10, 'phoneNumber must be 10 characters only'),
    name: z
      .string({
        invalid_type_error: 'name must be a string',
        required_error: 'name is required',
      })
      .trim()
      .min(1, 'name cannot be empty'),
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
      .trim()
      .min(1, 'state cannot be empty'),
    city: z
      .string({
        invalid_type_error: 'city must be a string',
        required_error: 'city is required',
      })
      .trim()
      .min(1, 'city cannot be empty'),
    pincode: z
      .string({
        invalid_type_error: 'pincode must be a string',
        required_error: 'pincode is required',
      })
      .trim()
      .min(1, 'pincode cannot be empty'),
    lat: z.number({
      invalid_type_error: 'lat must be a float',
      required_error: 'lat is required',
    }),
    lng: z.number({
      invalid_type_error: 'lng must be a float',
      required_error: 'lng is required',
    }),
  }),
});

const getAccountSchema = z.object({
  params: z.object({
    userId: z.coerce.number({
      invalid_type_error: 'userId must be a number',
      required_error: 'userId is required',
    }),
  }),
});

module.exports = { createAccountSchema, getAccountSchema };
