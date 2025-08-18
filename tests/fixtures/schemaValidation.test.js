const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const validators = require('../schemas/validate');

function toKey(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

describe('JSON schema fixtures', () => {
  const dir = path.join(__dirname, 'fixtures');
  fs.readdirSync(dir).forEach((file) => {
    const base = path.basename(file, '.json');
    const key = toKey(base);
    const validate = validators[key];
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    it(`${file} validates against ${key} schema`, () => {
      expect(validate, `missing validator for ${key}`).to.be.a('function');
      const valid = validate(data);
      if (!valid) console.error(validate.errors);
      expect(valid).to.equal(true);
    });
  });
});
