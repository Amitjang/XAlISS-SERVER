const { Schema, ZodError } = require('zod');

/**
 * @param {Schema} schema Schema
 */
function validate(schema) {
  return async function (req, res, next) {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError)
        return res
          .status(400)
          .json({ message: error.issues[0].message, status: 'error' });
      else
        return res.status(400).json({
          message: `☠️ ${error?.message}` ?? 'Something went wrong!',
          status: 'error',
        });
    }
  };
}

module.exports = validate;
