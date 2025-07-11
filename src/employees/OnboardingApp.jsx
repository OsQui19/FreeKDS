import React, { useState, useEffect } from 'react';

export default function OnboardingApp() {
  const emptyForm = {
    first_name: '',
    last_name: '',
    position: '',
    start_date: '',
    email: '',
    phone: '',
    wage_rate: '',
    username: '',
    password: '',
    pin: '',
    role: '',
  };

  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editIndex, setEditIndex] = useState(-1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [empRes, roleRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/hierarchy'),
        ]);
        const empJson = await empRes.json();
        const roleJson = await roleRes.json();
        setEmployees(empJson.employees || []);
        setRoles(roleJson.hierarchy || []);
        setForm(f => ({ ...f, role: (roleJson.hierarchy || [])[0] || '' }));
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const resetForm = () => {
    setForm((f) => ({ ...emptyForm, role: roles[0] || '' }));
    setEditIndex(-1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const list = [...employees];
    if (editIndex >= 0) list[editIndex] = { ...list[editIndex], ...form };
    else list.push({ ...form, id: Date.now() });
    setEmployees(list);
    resetForm();
    try {
      await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: list }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (idx) => {
    const emp = employees[idx];
    if (!emp) return;
    setEditIndex(idx);
    setForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      position: emp.position || '',
      start_date: emp.start_date || '',
      email: emp.email || '',
      phone: emp.phone || '',
      wage_rate: emp.wage_rate || '',
      username: emp.username || '',
      password: '',
      pin: '',
      role: emp.role || roles[0] || '',
    });
  };

  const filtered = employees.filter((e) => {
    const f = search.toLowerCase();
    return (
      (e.first_name && e.first_name.toLowerCase().includes(f)) ||
      (e.last_name && e.last_name.toLowerCase().includes(f)) ||
      (e.position && e.position.toLowerCase().includes(f)) ||
      (e.role && e.role.toLowerCase().includes(f))
    );
  });

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="row g-2 mb-3">
          <div className="col-sm-3">
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="First Name"
            />
          </div>
          <div className="col-sm-3">
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Last Name"
            />
          </div>
          <div className="col-sm-3">
            <input
              type="text"
              name="position"
              value={form.position}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Position"
            />
          </div>
          <div className="col-sm-3">
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="form-control form-control-sm"
            />
          </div>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-sm-3">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Email"
            />
          </div>
          <div className="col-sm-3">
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Phone"
            />
          </div>
          <div className="col-sm-3">
            <input
              type="number"
              step="0.01"
              name="wage_rate"
              value={form.wage_rate}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Wage Rate"
            />
          </div>
          <div className="col-sm-3">
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Username"
            />
          </div>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-sm-4">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="Password"
              autoComplete="new-password"
            />
          </div>
          <div className="col-sm-4">
            <input
              type="password"
              name="pin"
              value={form.pin}
              onChange={handleChange}
              className="form-control form-control-sm"
              placeholder="PIN (4-6 digits)"
              autoComplete="new-password"
              pattern="\d{4,6}"
            />
          </div>
          <div className="col-sm-4">
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="form-select form-select-sm"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          {editIndex >= 0 ? 'Update' : 'Save'}
        </button>
        {editIndex >= 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm ms-2"
            onClick={resetForm}
          >
            Cancel
          </button>
        )}
      </form>
      <div className="mt-4">
        <h5>Current Employees</h5>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control form-control-sm mb-2"
          placeholder="Search employees"
        />
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>First</th>
                <th>Last</th>
                <th>Position</th>
                <th>Start</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Wage</th>
                <th>Username</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id || i}>
                  <td>{e.first_name}</td>
                  <td>{e.last_name}</td>
                  <td>{e.position}</td>
                  <td>{e.start_date}</td>
                  <td>{e.email}</td>
                  <td>{e.phone}</td>
                  <td>{e.wage_rate}</td>
                  <td>{e.username}</td>
                  <td>{e.role}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => startEdit(i)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
