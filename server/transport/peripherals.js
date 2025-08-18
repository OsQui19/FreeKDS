const hooks = { label: [], receipt: [], hid: [] };

function registerHook(type, fn) {
  if (!hooks[type]) hooks[type] = [];
  hooks[type].push(fn);
}

function trigger(type, payload) {
  (hooks[type] || []).forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Peripheral hook error', err);
    }
  });
}

module.exports = {
  registerHook,
  trigger,
};
