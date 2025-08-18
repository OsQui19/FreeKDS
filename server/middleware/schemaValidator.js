const validators = require('../../schemas/validate');

/**
 * Returns Express middleware that validates `dataSelector(req)`
 * against the schema identified by `keyOrFn`.
 * @param {string|function(req):string} keyOrFn Schema key or function producing it.
 * @param {function(req):any} [dataSelector] Function selecting data to validate.
 */
module.exports = function schemaValidator(keyOrFn, dataSelector = (req) => req.body) {
  return (req, res, next) => {
    const key = typeof keyOrFn === 'function' ? keyOrFn(req) : keyOrFn;
    const validate = validators[key];
    if (!validate) return next(new Error(`No validator for schema: ${key}`));
    const data = dataSelector(req);
    if (!validate(data)) {
      return res.status(400).json({ errors: validate.errors });
    }
    next();
  };
};
