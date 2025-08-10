const { expect } = require('chai');
const {
  saveHierarchy,
  savePermissions,
  getRolePermissions,
  roleHasAccess,
} = require('../controllers/accessControl');

describe('access control permissions', () => {
  const dbStub = {
    promise() {
      return {
        query: async () => [[], []],
      };
    },
  };

  beforeEach(async () => {
    await saveHierarchy(dbStub, ['FOH', 'BOH', 'management']);
    await savePermissions(dbStub, {
      management: ['menu', 'reports'],
      BOH: ['Stations', 'order'],
      FOH: ['order'],
    });
  });

  after(async () => {
    await saveHierarchy(dbStub, ['FOH', 'BOH', 'management']);
    await savePermissions(dbStub, {});
  });

  it('aggregates permissions from lower roles', () => {
    const boh = getRolePermissions('BOH');
    expect(boh).to.have.members(['order', 'stations']);

    const mgmt = getRolePermissions('management');
    expect(mgmt).to.include.members(['order', 'stations', 'menu', 'reports']);
  });

  it('roleHasAccess uses aggregated permissions', () => {
    expect(roleHasAccess('BOH', 'order')).to.equal(true);
    expect(roleHasAccess('BOH', 'menu')).to.equal(false);
    expect(roleHasAccess('management', 'stations')).to.equal(true);
  });
});
