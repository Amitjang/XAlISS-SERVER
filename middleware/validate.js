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
      return res
        .status(400)
        .json({ errors: error.issues[0].message, status: 'error' });
    }
  };
}

module.exports = validate;
