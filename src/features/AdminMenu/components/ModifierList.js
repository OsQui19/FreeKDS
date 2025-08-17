const React = require('react');
const { useAdminMenu } = require('./AdminMenuContext.js');

function ModifierList({ modifiers = [] }) {
  const { toggleModifier, setModifierReplace, ingredientFields, modifiers: selected } =
    useAdminMenu();
  return React.createElement(
    'div',
    null,
    modifiers.map((mod) =>
      React.createElement(
        'div',
        { key: mod.id },
        React.createElement(
          'label',
          null,
          React.createElement('input', {
            type: 'checkbox',
            checked: selected[mod.id]?.checked || false,
            onChange: (e) => toggleModifier(mod.id, e.target.checked),
          }),
          mod.name,
        ),
        React.createElement(
          'select',
          {
            'aria-label': `Replace ${mod.name}`,
            value: selected[mod.id]?.replace || '',
            onChange: (e) => setModifierReplace(mod.id, e.target.value),
            disabled: !selected[mod.id]?.checked,
          },
          React.createElement('option', { value: '' }, 'Adds'),
          ingredientFields.map((f, idx) =>
            React.createElement(
              'option',
              { key: idx, value: String(idx) },
              f.name || `Ingredient ${idx + 1}`,
            ),
          ),
        ),
      ),
    ),
  );
}

module.exports = ModifierList;
