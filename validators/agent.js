const z = require('zod');

const { dobRegex, pinRegex, phoneNumberValidator } = require('../constants');

const createAgentSchema = z.object({
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
      gender: z.enum(['Male', 'Female', 'Other'], {
        invalid_type_error: 'gender must be a string',
        required_error: 'gender is required',
      }),
      occupation: z
        .string({
          invalid_type_error: 'occupation must be a string',
          required_error: 'occupation is required',
        })
        .min(1, 'occupation cannot be empty'),
      relativeDialCode: z
        .string({
          invalid_type_error: 'relativeDialCode must be a string',
          required_error: 'relativeDialCode is required',
        })
        .trim()
        .min(1, 'relativeDialCode cannot be empty'),
      relativePhoneNumber: z
        .string({
          invalid_type_error: 'relativePhoneNumber must be a string',
          required_error: 'relativePhoneNumber is required',
        })
        .trim()
        .min(1, 'relativePhoneNumber cannot be empty'),
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
      dateOfBirth: z
        .string({
          invalid_type_error: 'dateOfBirth must be a string',
          required_error: 'dateOfBirth is required',
        })
        .trim()
        .min(1, 'dateOfBirth cannot be empty')
        .regex(dobRegex, 'dateOfBirth must be of format DD/MM/YYYY'),
      verificationNumber: z
        .string({
          invalid_type_error: 'verificationNumber must be a string',
          required_error: 'verificationNumber is required',
        })
        .trim()
        .min(1, 'verificationNumber cannot be empty'),
      transactionPin: z
        .string({
          invalid_type_error: 'transactionPin must be a string',
          required_error: 'transactionPin is required',
        })
        .trim()
        .min(1, 'transactionPin cannot be empty')
        .regex(pinRegex, 'transactionPin must only contain numbers')
        .min(4, 'transactionPin must be 4 characters long')
        .max(4, 'transactionPin must be 4 characters long'),
    })
    .refine(
      val =>
        phoneNumberValidator({
          dialCode: val.dialCode,
          phoneNumber: val.phoneNumber,
        }),
      { message: 'phoneNumber is invalid' }
    )
    .refine(
      val =>
        phoneNumberValidator({
          dialCode: val.relativeDialCode,
          phoneNumber: val.relativePhoneNumber,
        }),
      {
        message: 'relativePhoneNumber is invalid',
      }
    ),
});

const getAgentSchema = z.object({
  params: z.object({
    agentId: z.coerce.number({
      invalid_type_error: 'agentId must be a number',
      required_error: 'agentId is required',
    }),
  }),
});

const loginAgentSchema = z.object({
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
    })
    .refine(phoneNumberValidator, { message: 'phoneNumber is invalid' }),
});

const forgotPinAgentSchema = z.object({
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
    })
    .refine(phoneNumberValidator, { message: 'phoneNumber is invalid' }),
});

const setNewPinAgentSchema = z.object({
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
    })
    .refine(phoneNumberValidator, { message: 'phoneNumber is invalid' }),
});

const getAgentSecretKeySchema = z.object({
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
      transactionPin: z
        .string({
          invalid_type_error: 'transactionPin must be a string',
          required_error: 'transactionPin is required',
        })
        .trim()
        .min(1, 'transactionPin cannot be empty')
        .regex(pinRegex, 'pin must only contain numbers')
        .min(4, 'transactionPin must be 4 characters long')
        .max(4, 'transactionPin must be 4 characters long'),
    })
    .refine(phoneNumberValidator, { message: 'phoneNumber is invalid' }),
});

module.exports = {
  createAccountSchema: createAgentSchema,
  getAccountSchema: getAgentSchema,
  loginAgentSchema,
  forgotPinAgentSchema,
  setNewPinAgentSchema,
  getAgentSecretKeySchema,
};
