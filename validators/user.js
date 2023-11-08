const z = require('zod');

const { phoneNumberValidator, CONTRACT_TYPES } = require('../constants');
const { subDays } = require('date-fns');

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

const createContractUserSchema = z.object({
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
      agentDialCode: z
        .string({
          invalid_type_error: 'agentDialCode must be a string',
          required_error: 'agentDialCode is required',
        })
        .trim()
        .min(1, 'agentDialCode cannot be empty'),
      agentPhoneNumber: z
        .string({
          invalid_type_error: 'agentPhoneNumber must be a string',
          required_error: 'agentPhoneNumber is required',
        })
        .trim()
        .min(1, 'agentPhoneNumber cannot be empty'),
      contractType: z.enum(CONTRACT_TYPES, {
        invalid_type_error: `contractType can be: ${CONTRACT_TYPES.join(
          ' | '
        )}`,
        required_error: 'contractType is required',
      }),
      amount: z
        .number({
          coerce: true,
          invalid_type_error: 'amount must be a number',
          required_error: 'amount is required',
        })
        .positive('amount cannot be negative'),
      comment: z
        .string({
          invalid_type_error: 'comment must be a string',
          required_error: 'comment is required',
        })
        .trim()
        .min(1, 'comment cannot be empty'),
      firstPaymentDate: z
        .date({
          coerce: true,
          invalid_type_error: 'firstPaymentDate must be a date',
          required_error: 'firstPaymentDate is required',
        })
        .min(
          subDays(new Date(), 1),
          'firstPaymentDate must be greater than or equal to today'
        ),
      address: z
        .string({
          invalid_type_error: 'address must be a string',
          required_error: 'address is required',
        })
        .trim()
        .min(1, 'address cannot be empty'),
      lat: z.number({
        coerce: true,
        invalid_type_error: 'lat must be a number',
        required_error: 'lat is required',
      }),
      lng: z.number({
        coerce: true,
        invalid_type_error: 'lng must be a number',
        required_error: 'lng is required',
      }),
    })
    .refine(phoneNumberValidator, 'phoneNumber is invalid')
    .refine(
      val =>
        phoneNumberValidator({
          dialCode: val.agentDialCode,
          phoneNumber: val.agentPhoneNumber,
        }),
      { message: 'agentDialCode/agentPhoneNumber is invalid' }
    ),
});

module.exports = { createUserSchema, getUserSchema, createContractUserSchema };
