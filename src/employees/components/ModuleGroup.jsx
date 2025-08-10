import React from 'react';

export default function ModuleGroup({
  group,
  index,
  collapsed,
  toggleGroup,
  role,
  permissions,
  togglePermission,
}) {
  return (
    <div className="module-group mb-3">
      <button
        type="button"
        className="btn btn-link btn-sm arrow-toggle"
        onClick={() => toggleGroup(index)}
      >
        <i className={`bi ${collapsed ? 'bi-caret-right' : 'bi-caret-down'}`} />
      </button>
      <span className="ms-1 fw-semibold">{group.category}</span>
      {!collapsed && (
        <ul className="list-group mt-2">
          {group.modules.map((m) => (
            <li
              key={m}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>{m.replace(/-/g, ' ')}</span>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={(permissions[role] || []).includes(m)}
                  onChange={() => togglePermission(role, m)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
