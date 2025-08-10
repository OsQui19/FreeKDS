const { expect } = require('chai');
const { getBumpedOrders } = require('../controllers/db/orders');

describe('db/orders', () => {
  it('getBumpedOrders aggregates results', async () => {
    const calls = [];
    const db = {
      promise() {
        return {
          query(sql, params) {
            calls.push(sql);
            if (calls.length === 1) {
              return Promise.resolve([
                [
                  {
                    order_id: 1,
                    order_number: 'A',
                    order_type: 'test',
                    special_instructions: '',
                    allergy: 0,
                    ts: 123,
                  },
                ],
                [],
              ]);
            }
            return Promise.resolve([
              [
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
              ],
              [],
            ]);
          },
        };
      },
    };
    const orders = await getBumpedOrders(db, 1);
    expect(orders).to.have.length(1);
    expect(orders[0].items[0].name).to.equal('Burger');
  });
});
