import React, { useEffect, useState } from 'react';

export default function HierarchyApp() {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const [roleRes, permRes, modRes] = await Promise.all([
          fetch('/api/hierarchy'),
          fetch('/api/permissions'),
          fetch('/api/modules'),
        ]);
        const roleJson = await roleRes.json();
        const permJson = await permRes.json();
        const modJson = await modRes.json();
        setRoles(roleJson.hierarchy || []);
        setPermissions(permJson.permissions || {});
        setModules(modJson.modules || []);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const saveHierarchy = async (arr) => {
    setRoles(arr);
    try {
      await fetch('/api/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hierarchy: arr }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const savePermissions = async (obj) => {
    setPermissions(obj);
    try {
      await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: obj }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addRole = (e) => {
    e.preventDefault();
    const name = e.target.role.value.trim();
    if (!name || roles.includes(name)) return;
    const list = [...roles, name];
    saveHierarchy(list);
    setPermissions((p) => ({ ...p, [name]: [] }));
    e.target.reset();
  };

  const moveUp = (idx) => {
    if (idx <= 0) return;
    const list = [...roles];
    [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
    saveHierarchy(list);
  };

  const moveDown = (idx) => {
    if (idx >= roles.length - 1) return;
    const list = [...roles];
    [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
    saveHierarchy(list);
  };

  const removeRole = (idx) => {
    const name = roles[idx];
    const list = roles.filter((_, i) => i !== idx);
    const perms = { ...permissions };
    delete perms[name];
    saveHierarchy(list);
    savePermissions(perms);
  };

  const togglePermission = (role, mod) => {
    const current = new Set(permissions[role] || []);
    if (current.has(mod)) current.delete(mod);
    else current.add(mod);
    savePermissions({ ...permissions, [role]: Array.from(current) });
  };

  return (
    <div>
      <h5>Roles</h5>
      <p className="text-muted small">
        Order roles from lowest to highest privilege. The last role has access to
        everything.
      </p>
      <ul className="list-group mb-2">
        {roles.map((r, i) => (
          <li
            key={r}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <span>
              {r}
              {i === roles.length - 1 && (
                <span className="badge bg-success ms-2">Highest</span>
              )}
            </span>
            <span>
              <button
                className="btn btn-sm btn-outline-secondary me-1"
                onClick={() => moveUp(i)}
              >
                &uarr;
              </button>
              <button
                className="btn btn-sm btn-outline-secondary me-1"
                onClick={() => moveDown(i)}
              >
                &darr;
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeRole(i)}
              >
                &times;
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={addRole} className="d-flex">
        <input
          type="text"
          name="role"
          className="form-control form-control-sm me-2"
          placeholder="New role"
        />
        <button type="submit" className="btn btn-sm btn-primary">
          Add
        </button>
      </form>
      <h5 className="mt-3">Module Access</h5>
      <div className="table-responsive">
        <table className="table table-sm">
          <thead>
            <tr className="table-light">
              <th>Role</th>
              {modules.map((m) => (
                <th key={m}>{m.replace(/-/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r}>
                <th>{r}</th>
                {modules.map((m) => (
                  <td key={m}>
                    <input
                      type="checkbox"
                      checked={(permissions[r] || []).includes(m)}
                      onChange={() => togglePermission(r, m)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
