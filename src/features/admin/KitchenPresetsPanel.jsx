import React, { useState } from 'react';
import { presetNames, applyKitchenPreset } from '../../../packages/admin/presets.js';

export default function KitchenPresetsPanel() {
  const [selected, setSelected] = useState('');

  const handleChange = async (e) => {
    const name = e.target.value;
    setSelected(name);
    if (name) {
      await applyKitchenPreset(name);
    }
  };

  return (
    <div>
      <label className="form-label me-2">Preset</label>
      <select
        className="form-select d-inline-block w-auto"
        value={selected}
        onChange={handleChange}
      >
        <option value="">Select preset</option>
        {presetNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

KitchenPresetsPanel.meta = {
  id: 'kitchen-presets',
  title: 'Kitchen Presets',
  dataDomain: 'layout',
  scopes: ['layout:write', 'tokens:write', 'routes:write'],
  latencyClass: 'interactive',
};
