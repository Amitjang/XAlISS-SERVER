const z = require('zod');

const enumType = ['agent', 'user', 'admin'];
const sendNotificationSchema = z.object({
  body: z.object({
    type: z
      .enum(enumType, {
        invalid_type_error: 'type must be a string',
      })
      .nullish(),
    refId: z
      .number({
        coerce: true,
        invalid_type_error: 'refId must be a number',
      })
      .int('refId must be an integer')
      .nullish(),
    token: z
      .string({
        invalid_type_error: 'token must be a string',
      })
      .min(1, 'token cannot be empty')
      .nullish(),
    topic: z
      .string({ invalid_type_error: 'topic must be a string' })
      .min(1, 'topic cannot be empty')
      .nullish(),
    title: z
      .string({
        invalid_type_error: 'title must be a string',
        required_error: 'title is required',
      })
      .min(1, 'title cannot be empty'),
    body: z
      .string({
        invalid_type_error: 'body must be a string',
        required_error: 'body is required',
      })
      .min(1, 'body cannot be empty'),
    data: z.any(),
  }),
});

module.exports = { sendNotificationSchema };
