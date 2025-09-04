import React, { useEffect, useState } from 'react';

function RowEditor({ row, onSave, saving }) {
  const [inVal, setInVal] = useState(
    row.clock_in ? new Date(row.clock_in).toISOString().slice(0, 16) : ''
  );
  const [outVal, setOutVal] = useState(
    row.clock_out ? new Date(row.clock_out).toISOString().slice(0, 16) : ''
  );
  return (
    <tr>
      <td>{row.id}</td>
      <td>{row.name}</td>
      <td style={{ minWidth: '220px' }}>
        <input
          type="datetime-local"
          className="form-control form-control-sm"
          value={inVal}
          onChange={(e) => setInVal(e.target.value)}
        />
      </td>
      <td style={{ minWidth: '220px' }}>
        <input
          type="datetime-local"
          className="form-control form-control-sm"
          value={outVal}
          onChange={(e) => setOutVal(e.target.value)}
        />
      </td>
      <td>
        <button
          className="btn btn-sm btn-primary"
          disabled={saving}
          onClick={() =>
            onSave(
              row.id,
              inVal ? new Date(inVal).toISOString() : null,
              outVal ? new Date(outVal).toISOString() : null,
            )
          }
        >
          Save
        </button>
      </td>
    </tr>
  );
}

export default function TimeClockRoute() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [newRec, setNewRec] = useState({ employee_id: '', clock_in: '', clock_out: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/time-clock');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setRows(json.records || []);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (id, clock_in, clock_out) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/time-clock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clock_in, clock_out }),
      });
      if (!res.ok) throw new Error('Save failed');
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setSavingId(null);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setSavingId('new');
    try {
      if (!newRec.employee_id || !newRec.clock_in) throw new Error('Employee ID and Clock In are required');
      const res = await fetch('/api/time-clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRec) });
      if (!res.ok) throw new Error('Create failed');
      setNewRec({ employee_id: '', clock_in: '', clock_out: '' });
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      const res = await fetch(`/api/time-clock/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-section">
      <h3 className="mb-3">Time Clock</h3>
      <form className="row g-2 mb-3" onSubmit={create}>
        <div className="col-md-3">
          <input className="form-control" placeholder="Employee ID" value={newRec.employee_id} onChange={(e)=>setNewRec((v)=>({...v,employee_id:e.target.value}))} required />
        </div>
        <div className="col-md-3">
          <input type="datetime-local" className="form-control" value={newRec.clock_in} onChange={(e)=>setNewRec((v)=>({...v,clock_in:e.target.value}))} required />
        </div>
        <div className="col-md-3">
          <input type="datetime-local" className="form-control" value={newRec.clock_out} onChange={(e)=>setNewRec((v)=>({...v,clock_out:e.target.value}))} />
        </div>
        <div className="col-md-3">
          <button className="btn btn-primary w-100" disabled={savingId==='new' || !newRec.employee_id || !newRec.clock_in}>Add</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <RowEditor key={r.id} row={r} saving={savingId === r.id} onSave={save} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
