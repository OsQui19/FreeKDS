const logger = require('../utils/logger');
const { expect } = require('chai');
const { validateSettings } = require('../utils/validateSettings');

describe('validateSettings', () => {
  it('accepts valid values', () => {
    const input = {
      theme_primary_color: '#aabbcc',
      theme_bg_color: '#ffffff',
      ticket_layout: '3',
      button_radius: '10',
      menu_layout: 'list'
    };
    const { settings, errors } = validateSettings(input);
    expect(errors).to.have.lengthOf(0);
    expect(settings).to.deep.equal({
      theme_primary_color: '#aabbcc',
      theme_bg_color: '#ffffff',
      ticket_layout: 3,
      button_radius: 10,
      menu_layout: 'list'
    });
  });

  it('rejects invalid colors', () => {
    const { errors } = validateSettings({ theme_primary_color: 'blue' });
    expect(errors).to.include('theme_primary_color');
  });

  it('rejects out-of-range numbers', () => {
    const { errors } = validateSettings({ ticket_layout: '0', button_radius: '200' });
    expect(errors).to.include('ticket_layout');
    expect(errors).to.include('button_radius');
  });
});
