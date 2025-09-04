import React, { useEffect, useState } from 'react';

export default function PayrollRoute() {
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState('');
  const [rows, setRows] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPeriods = async () => {
    try {
      const res = await fetch('/api/payroll/periods');
      const json = await res.json();
      setPeriods(json.periods || []);
      if (!period && json.periods?.length) setPeriod(json.periods[0]);
    } catch {}
  };

  const load = async (p) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/payroll${p ? `?period_start=${p}` : ''}`);
      if (!res.ok) throw new Error('Failed to load payroll');
      const json = await res.json();
      setRows(json.payroll || []);
      setAdjustments(json.adjustments || []);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPeriods(); }, []);
  useEffect(() => { load(period); }, [period]);

  const adjMap = new Map(adjustments.map((a) => [a.employee_id, a]));
  const getAdj = (empId) => adjMap.get(empId)?.hours_adjustment || 0;

  const saveAdj = async (employee_id, hours_adjustment, note) => {
    setError(null);
    try {
      const res = await fetch('/api/payroll/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, period_start: period, hours_adjustment, note }),
      });
      if (!res.ok) throw new Error('Save failed');
      await load(period);
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-section">
      <div className="d-flex align-items-center mb-3">
        <h3 className="m-0">Payroll</h3>
        <div className="ms-3">
          <select className="form-select" value={period} onChange={(e)=>setPeriod(e.target.value)}>
            {periods.map((p)=> <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Period Start</th>
              <th>Hours</th>
              <th>Adjustment</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const adj = Number(getAdj(r.employee_id) || 0);
              const total = Number(r.hours || 0) + adj;
              return (
                <tr key={`${r.employee_id}-${r.period_start}`}>
                  <td>{r.name || r.employee_id}</td>
                  <td>{r.period_start}</td>
                  <td>{Number(r.hours).toFixed(2)}</td>
                  <td style={{ minWidth: 140 }}>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm"
                      defaultValue={adj}
                      onBlur={(e)=> saveAdj(r.employee_id, e.target.value, '')}
                    />
                  </td>
                  <td>{total.toFixed(2)}</td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
