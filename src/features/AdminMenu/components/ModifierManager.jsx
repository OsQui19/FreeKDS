import React, { useEffect, useMemo, useState } from 'react';

function fmt(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : '0.00';
}

export default function ModifierManager({ ingredients = [] }) {
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // id or 'new'

  const ingMap = useMemo(() => {
    const m = new Map();
    ingredients.forEach((i) => m.set(i.id, i));
    return m;
  }, [ingredients]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/modifiers');
      if (!res.ok) throw new Error('Failed to load modifiers');
      const json = await res.json();
      setRows(json.modifiers || []);
      setGroups(json.groups || []);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startNew = () => setEditing('new');
  const startEdit = (id) => setEditing(id);
  const cancelEdit = () => setEditing(null);

  const save = async (payload, id) => {
    try {
      setError(null);
      const url = id ? `/api/admin/modifiers/${id}` : '/api/admin/modifiers';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        let msg = 'Save failed';
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      setMessage(id ? 'Modifier updated' : 'Modifier created');
      await load();
      setEditing(null);
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this modifier?')) return;
    try {
      const res = await fetch(`/api/admin/modifiers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMessage('Modifier deleted');
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  const EditorRow = ({ initial = {} , id }) => {
    const [name, setName] = useState(initial.name || '');
    const [price, setPrice] = useState(initial.price != null ? String(initial.price) : '0');
    const [groupId, setGroupId] = useState(initial.group_id || '');
    const [ingredientId, setIngredientId] = useState(initial.ingredient_id || '');
    const onSubmit = (e) => {
      e.preventDefault();
      const payload = {
        name: name.trim(),
        price: parseFloat(price) || 0,
        group_id: groupId || null,
        ingredient_id: ingredientId ? parseInt(ingredientId, 10) : null,
      };
      save(payload, id);
    };
    return (
      <tr>
        <td><input className="form-control form-control-sm" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" /></td>
        <td style={{width:110}}><input className="form-control form-control-sm" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="0.00" /></td>
        <td>
          <select className="form-select form-select-sm" value={groupId || ''} onChange={(e)=>setGroupId(e.target.value || null)}>
            <option value="">None</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </td>
        <td>
          <select className="form-select form-select-sm" value={ingredientId || ''} onChange={(e)=>setIngredientId(e.target.value || '')}>
            <option value="">Select ingredient…</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </td>
        <td className="text-end">
          <button className="btn btn-sm btn-primary me-2" onClick={onSubmit}>Save</button>
          <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button>
        </td>
      </tr>
    );
  };

  return (
    <div className="card-surface p-3 mt-3">
      <div className="d-flex align-items-center mb-2">
        <h5 className="m-0">Modifiers</h5>
        <button className="btn btn-sm btn-outline-primary ms-auto" onClick={startNew}>Add Modifier</button>
      </div>
      {error && <div className="alert alert-danger py-1 mb-2">{error}</div>}
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{width:110}}>Price</th>
              <th>Group</th>
              <th>Ingredient</th>
              <th style={{width:160}}></th>
            </tr>
          </thead>
          <tbody>
            {editing === 'new' && <EditorRow id={null} initial={{}} />}
            {!loading && rows.map((r) => (
              editing === r.id ? (
                <EditorRow key={r.id} id={r.id} initial={r} />
              ) : (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>${fmt(r.price)}</td>
                  <td>{r.group_name || '—'}</td>
                  <td>{r.ingredient_name || '—'}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>startEdit(r.id)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=>del(r.id)}>Delete</button>
                  </td>
                </tr>
              )
            ))}
            {loading && (
              <tr><td colSpan={5}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {message && (
        <div className="toast show position-fixed bottom-0 end-0 m-3 text-bg-success">
          <div className="toast-body">{message}</div>
        </div>
      )}
    </div>
  );
}

