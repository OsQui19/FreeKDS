const { expect } = require('chai');
const { getBumpedOrders } = require('../controllers/db/orders');

describe('db/orders', () => {
  it('getBumpedOrders aggregates results', (done) => {
    const calls = [];
    const db = {
      query(sql, params, cb) {
        calls.push(sql);
        if (calls.length === 1) {
          cb(null, [
            {
              order_id: 1,
              order_number: 'A',
              order_type: 'test',
              special_instructions: '',
              allergy: 0,
              ts: 123,
            },
          ]);
        } else {
          cb(null, [
            {
              order_id: 1,
              quantity: 1,
              name: 'Burger',
              station_id: 2,
              item_id: 5,
              special_instructions: null,
              allergy: 0,
              modifiers: 'Cheese',
            },
          ]);
        }
      },
    };
    getBumpedOrders(db, 1, (err, orders) => {
      expect(err).to.be.null;
      expect(orders).to.have.length(1);
      expect(orders[0].items[0].name).to.equal('Burger');
      done();
    });
  });
});
