const { expect } = require('chai');
const { updateMenuItem } = require('../controllers/db/menu');

describe('db/menu', () => {
  it('updateMenuItem builds SQL and params', async () => {
    let capturedSql = null;
    let capturedParams = null;
    const db = {
      promise() {
        return {
          async query(sql, params) {
            capturedSql = sql;
            capturedParams = params;
            return [[], []];
          },
        };
      },
    };
    await updateMenuItem(db, 1, { price: 2.5, is_available: true });
    expect(capturedSql).to.equal('UPDATE menu_items SET price=?, is_available=? WHERE id=?');
    expect(capturedParams).to.deep.equal([2.5, 1, 1]);
  });
});
