const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function validateSettings(input) {
  const result = {};
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(input, 'brand_name')) {
    const v = String(input.brand_name).trim();
    if (v.length > 50) errors.push('brand_name');
    else result.brand_name = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'theme_primary_color')) {
    const v = String(input.theme_primary_color).trim();
    if (!hexColor.test(v)) errors.push('theme_primary_color');
    else result.theme_primary_color = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'theme_bg_color')) {
    const v = String(input.theme_bg_color).trim();
    if (!hexColor.test(v)) errors.push('theme_bg_color');
    else result.theme_bg_color = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'theme_wallpaper')) {
    const v = String(input.theme_wallpaper).trim();
    if (v && !/^https?:\/\/.+/.test(v)) errors.push('theme_wallpaper');
    else result.theme_wallpaper = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'ticket_layout')) {
    const n = parseInt(input.ticket_layout, 10);
    if (!Number.isInteger(n) || n < 1 || n > 6) errors.push('ticket_layout');
    else result.ticket_layout = n;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'font_family')) {
    const v = String(input.font_family).trim();
    if (v.length > 100) errors.push('font_family');
    else result.font_family = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'custom_css')) {
    result.custom_css = String(input.custom_css);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'text_color')) {
    const v = String(input.text_color).trim();
    if (!hexColor.test(v)) errors.push('text_color');
    else result.text_color = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'button_radius')) {
    const n = parseInt(input.button_radius, 10);
    if (!Number.isInteger(n) || n < 0 || n > 50) errors.push('button_radius');
    else result.button_radius = n;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'card_shadow')) {
    const v = String(input.card_shadow).trim();
    if (v.length > 100) errors.push('card_shadow');
    else result.card_shadow = v;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'menu_layout')) {
    const v = String(input.menu_layout).trim();
    if (v !== 'grid' && v !== 'list') errors.push('menu_layout');
    else result.menu_layout = v;
  }

  return { settings: result, errors };
}

module.exports = { validateSettings };
