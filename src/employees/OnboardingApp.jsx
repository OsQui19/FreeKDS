import React, { useState, useEffect } from 'react';
import EmployeeForm from './components/EmployeeForm';
import useEmployeeForm from './hooks/useEmployeeForm';

export default function OnboardingApp() {
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const { form, setForm, editIndex, setEditIndex, resetForm, handleChange } =
    useEmployeeForm(roles[0]);
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
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

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
      <EmployeeForm
        form={form}
        roles={roles}
        onChange={handleChange}
        onSubmit={handleSubmit}
        editIndex={editIndex}
        resetForm={resetForm}
      />
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
