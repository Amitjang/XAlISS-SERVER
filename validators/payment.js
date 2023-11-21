const z = require('zod');
const { phoneNumberValidator } = require('../constants');

const pinRegex = /^[0-9]+$/;

const sendPaymentSchema = z.object({
  body: z
    .object({
      senderDialCode: z
        .string({
          invalid_type_error: 'senderDialCode must be a string',
          required_error: 'senderDialCode is required',
        })
        .trim()
        .min(1, 'senderDialCode cannot be empty'),
      senderPhoneNumber: z
        .string({
          invalid_type_error: 'senderPhoneNumber must be a string',
          required_error: 'senderPhoneNumber is required',
        })
        .trim()
        .min(1, 'senderPhoneNumber cannot be empty'),
      senderTransactionPin: z
        .string({
          invalid_type_error: 'senderTransactionPin must be a string',
          required_error: 'senderTransactionPin is required',
        })
        .min(1, 'senderTransactionPin cannot be empty')
        .trim()
        .regex(pinRegex, 'senderTransactionPin must only contain numbers')
        .min(4, 'senderTransactionPin must be 4 characters long')
        .max(4, 'senderTransactionPin must be 4 characters long'),
      receiverDialCode: z
        .string({
          invalid_type_error: 'receiverDialCode must be a string',
          required_error: 'receiverDialCode is required',
        })
        .trim()
        .min(1, 'receiverDialCode cannot be empty'),
      receiverPhoneNumber: z
        .string({
          invalid_type_error: 'receiverPhoneNumber must be a string',
          required_error: 'receiverPhoneNumber is required',
        })
        .trim()
        .min(1, 'receiverPhoneNumber cannot be empty'),
      amount: z
        .number({
          invalid_type_error: 'amount must be a number',
          required_error: 'amount is required',
        })
        .positive('amount can only be positive'),
      purpose: z.enum(
        [
          'Chargement de Compte',
          'Transfert Interne',
          'Transfert client',
          "Recharge d'Urgence",
        ],
        {
          invalid_type_error:
            "purpose can either be: Chargement de Compte | Transfert Interne | Transfert client | Recharge d'Urgence",
          required_error: 'purpose is required',
        }
      ),
      contractId: z
        .number({
          coerce: true,
          invalid_type_error: 'contractId must be a number',
          required_error: 'contractId is required',
        })
        .int('contractId must be an integer')
        .positive('contractId must be a positive integer')
        .optional(),
    })
    .refine(
      val =>
        phoneNumberValidator({
          dialCode: val.senderDialCode,
          phoneNumber: val.senderPhoneNumber,
        }),
      { message: 'senderPhoneNumber is invalid' }
    )
    .refine(
      val =>
        phoneNumberValidator({
          dialCode: val.receiverDialCode,
          phoneNumber: val.receiverPhoneNumber,
        }),
      { message: 'receiverPhoneNumber is invalid' }
    ),
});

const getTodayPendingCollectionsSchema = z.object({
  query: z
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
    .refine(phoneNumberValidator, {
      message: 'dialCode/phoneNumber is invalid',
    }),
});

module.exports = { sendPaymentSchema, getTodayPendingCollectionsSchema };
