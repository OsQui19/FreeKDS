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
import ModuleGroup from './components/ModuleGroup';

export default function HierarchyApp() {
  const [roles, setRoles] = useState([]);
  const [moduleGroups, setModuleGroups] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('');
  const [modulesCollapsed, setModulesCollapsed] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});

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
        if (Array.isArray(modJson.groups)) {
          setModuleGroups(modJson.groups);
        } else if (Array.isArray(modJson.modules)) {
          setModuleGroups([{ category: 'modules', modules: modJson.modules }]);
        } else {
          setModuleGroups([]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (roles.length && !selectedRole) setSelectedRole(roles[0]);
  }, [roles, selectedRole]);

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

  const renameRole = (idx, newName) => {
    const old = roles[idx];
    if (!old || !newName || roles.includes(newName)) return;
    const list = roles.slice();
    list[idx] = newName;
    const perms = { ...permissions };
    if (perms[old]) {
      perms[newName] = perms[old];
      delete perms[old];
    }
    saveHierarchy(list);
    savePermissions(perms);
    if (selectedRole === old) setSelectedRole(newName);
  };


  const removeRole = (idx) => {
    if (idx === roles.length - 1) {
      // prevent removing the highest role
      alert('Cannot remove the highest role');
      return;
    }
    if (!window.confirm('Remove this role?')) return;
    const name = roles[idx];
    const list = roles.filter((_, i) => i !== idx);
    const perms = { ...permissions };
    delete perms[name];
    saveHierarchy(list);
    savePermissions(perms);
    if (selectedRole === name) setSelectedRole(list[0] || '');
  };

  const togglePermission = (role, mod) => {
    const current = new Set(permissions[role] || []);
    if (current.has(mod)) current.delete(mod);
    else current.add(mod);
    savePermissions({ ...permissions, [role]: Array.from(current) });
  };

  const toggleGroup = (idx) => {
    setCollapsedGroups((c) => ({ ...c, [idx]: !c[idx] }));
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
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(id);
    const finishEdit = () => {
      setEditing(false);
      if (name.trim() && name.trim() !== id) renameRole(index, name.trim());
      else setName(id);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setName(id);
        setEditing(false);
      }
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`role-card${id === selectedRole ? ' selected' : ''}`}
        onClick={() => setSelectedRole(id)}
      >
        <div className="d-flex align-items-center flex-grow-1">
          <span className="drag-handle me-2" {...attributes} {...listeners}>
            <i className="bi bi-grip-vertical" />
          </span>
          {editing ? (
            <input
              className="form-control form-control-sm edit-input me-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={onKeyDown}
              autoFocus
            />
          ) : (
            <span
              className="role-name flex-grow-1"
              onDoubleClick={() => setEditing(true)}
            >
              {id}
              {highest && <span className="badge bg-success ms-2">Highest</span>}
            </span>
          )}
        </div>
        <div className="d-flex align-items-center ms-2">
          {!editing && (
            <button
              className="btn btn-sm btn-link p-0 me-2"
              onClick={() => setEditing(true)}
              aria-label="Rename"
            >
              <i className="bi bi-pencil" />
            </button>
          )}
          <button
            className="delete-btn"
            onClick={() => removeRole(index)}
            aria-label="Delete"
          >
            <i className="bi bi-trash" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="hierarchy-wrapper">
      <div className="roles-panel">
        <h5>Roles</h5>
        <p className="text-muted small">
          Order roles from lowest to highest privilege. The last role has access to everything.
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
          <button type="submit" className="btn btn-sm btn-primary">Add</button>
        </form>
      </div>
      <div className="modules-panel">
        <h5 className="d-flex align-items-center">
          Module Access
          <button
            type="button"
            className="btn btn-link btn-sm ms-2 module-toggle"
            onClick={() => setModulesCollapsed(!modulesCollapsed)}
          >
            {modulesCollapsed ? 'Show' : 'Hide'}
          </button>
        </h5>
        {!modulesCollapsed && selectedRole && (
          <div>
            {moduleGroups.map((grp, idx) => (
              <ModuleGroup
                key={grp.category || idx}
                group={grp}
                index={idx}
                collapsed={collapsedGroups[idx]}
                toggleGroup={toggleGroup}
                role={selectedRole}
                permissions={permissions}
                togglePermission={togglePermission}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
