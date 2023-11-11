const z = require('zod');

const {
  phoneNumberValidator,
  CONTRACT_TYPES,
  USER_TYPES,
  pinRegex,
  dobRegex,
} = require('../constants');
const { subDays } = require('date-fns');

const createUserSchema = z.object({
  body: z
    .object({
      agentId: z
        .number({
          coerce: true,
          invalid_type_error: 'agentId must be a number',
          // required_error: 'agentId is required',
        })
        .int('agentId must be an integer')
        .positive('agentId must be a positive integer')
        .optional(),
      name: z
        .string({
          invalid_type_error: 'name must be a string',
          required_error: 'name is required',
        })
        .trim()
        .min(1, 'name cannot be empty'),
      email: z
        .string({ invalid_type_error: 'email must be a string' })
        .email('email must be a valid email address')
        .optional(),
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
      pin: z
        .string({
          invalid_type_error: 'pin must be a string',
          required_error: 'pin is required',
        })
        .trim()
        .min(1, 'pin cannot be empty')
        .regex(pinRegex, 'pin must only contain numbers')
        .min(4, 'pin must be 4 characters long')
        .max(4, 'pin must be 4 characters long')
        .optional(),
      transactionPin: z
        .string({
          invalid_type_error: 'transactionPin must be a string',
          required_error: 'transactionPin is required',
        })
        .trim()
        .min(1, 'transactionPin cannot be empty')
        .regex(pinRegex, 'transactionPin must only contain numbers')
        .min(4, 'transactionPin must be 4 characters long')
        .max(4, 'transactionPin must be 4 characters long')
        .optional(),
      gender: z
        .enum(['Male', 'Female', 'Other'], {
          invalid_type_error: 'gender must be a string',
          required_error: 'gender is required',
        })
        .optional(),
      occupation: z
        .string({
          invalid_type_error: 'occupation must be a string',
          required_error: 'occupation is required',
        })
        .min(1, 'occupation cannot be empty')
        .optional(),
      relativeDialCode: z
        .string({
          invalid_type_error: 'relativeDialCode must be a string',
          required_error: 'relativeDialCode is required',
        })
        .trim()
        .min(1, 'relativeDialCode cannot be empty')
        .optional(),
      relativePhoneNumber: z
        .string({
          invalid_type_error: 'relativePhoneNumber must be a string',
          required_error: 'relativePhoneNumber is required',
        })
        .trim()
        .min(1, 'relativePhoneNumber cannot be empty')
        .optional(),
      dateOfBirth: z
        .string({
          invalid_type_error: 'dateOfBirth must be a string',
          required_error: 'dateOfBirth is required',
        })
        .trim()
        .min(1, 'dateOfBirth cannot be empty')
        .regex(dobRegex, 'dateOfBirth must be of format DD/MM/YYYY')
        .optional(),
      type: z
        .enum(USER_TYPES, {
          invalid_type_error: `type can either be ${USER_TYPES.join(' | ')}`,
          required_error: 'type is required',
        })
        .optional(),
    })
    .refine(phoneNumberValidator, {
      message: 'dialCode/phoneNumber is invalid',
    })
    .refine(
      val =>
        // if (val.relativeDialCode && val.phoneNumber)
        phoneNumberValidator({
          dialCode: val.relativeDialCode,
          phoneNumber: val.relativePhoneNumber,
        }),
      { message: 'relativeDialCode/relativePhoneNumber is invalid' }
    ),
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
