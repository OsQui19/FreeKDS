import React, { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = roles.indexOf(active.id);
      const newIndex = roles.indexOf(over.id);
      const list = arrayMove(roles, oldIndex, newIndex);
      saveHierarchy(list);
    }
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

  const RoleItem = ({ id, index, highest }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <div ref={setNodeRef} style={style} className="role-card">
        <div className="d-flex align-items-center">
          <span className="drag-handle me-2" {...attributes} {...listeners}>
            <i className="bi bi-grip-vertical" />
          </span>
          <span className="role-name">
            {id}
            {highest && <span className="badge bg-success ms-2">Highest</span>}
          </span>
        </div>
        <button
          className="delete-btn"
          onClick={() => removeRole(index)}
          aria-label="Delete"
        >
          <i className="bi bi-trash" />
        </button>
      </div>
    );
  };

  return (
    <div>
      <h5>Roles</h5>
      <p className="text-muted small">
        Order roles from lowest to highest privilege. The last role has access to
        everything.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={roles} strategy={verticalListSortingStrategy}>
          <div className="roles-list mb-2">
            {roles.map((r, i) => (
              <RoleItem key={r} id={r} index={i} highest={i === roles.length - 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
        <div
          className="permissions-grid"
          style={{ gridTemplateColumns: `repeat(${modules.length + 1}, minmax(120px,1fr))` }}
        >
          <div className="header">Role</div>
          {modules.map((m) => (
            <div key={`h-${m}`} className="header text-center">
              {m.replace(/-/g, ' ')}
            </div>
          ))}
          {roles.map((r) => (
            <React.Fragment key={r}>
              <div className="cell role-name">{r}</div>
              {modules.map((m) => (
                <div key={m} className="cell">
                  <div className="form-check form-switch d-flex justify-content-center">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={(permissions[r] || []).includes(m)}
                      onChange={() => togglePermission(r, m)}
                    />
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
