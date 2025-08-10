import React from 'react';

export default function RoleSelector({ roles = [], value, onChange }) {
  return (
    <select
      name="role"
      value={value}
      onChange={onChange}
      className="form-select form-select-sm"
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
