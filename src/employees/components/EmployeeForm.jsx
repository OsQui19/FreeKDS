import React from 'react';
import RoleSelector from './RoleSelector';

export default function EmployeeForm({ form, roles, onChange, onSubmit, editIndex, resetForm }) {
  return (
    <form onSubmit={onSubmit} className="mb-4">
      <div className="row g-2 mb-3">
        <div className="col-sm-3">
          <input
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={onChange}
            className="form-control form-control-sm"
            placeholder="First Name"
          />
        </div>
        <div className="col-sm-3">
          <input
            type="text"
            name="last_name"
            value={form.last_name}
            onChange={onChange}
            className="form-control form-control-sm"
            placeholder="Last Name"
          />
        </div>
        <div className="col-sm-3">
          <input
            type="text"
            name="position"
            value={form.position}
            onChange={onChange}
            className="form-control form-control-sm"
            placeholder="Position"
          />
        </div>
        <div className="col-sm-3">
          <input
            type="date"
            name="start_date"
            value={form.start_date}
            onChange={onChange}
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
            onChange={onChange}
            className="form-control form-control-sm"
            placeholder="Email"
          />
        </div>
        <div className="col-sm-3">
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={onChange}
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
            onChange={onChange}
            className="form-control form-control-sm"
            placeholder="Wage Rate"
          />
        </div>
        <div className="col-sm-3">
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
            className="form-control form-control-sm"
            placeholder="PIN (4-6 digits)"
            autoComplete="new-password"
            pattern="\d{4,6}"
          />
        </div>
        <div className="col-sm-4">
          <RoleSelector roles={roles} value={form.role} onChange={onChange} />
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-sm">
        {editIndex >= 0 ? 'Update' : 'Save'}
      </button>
      {editIndex >= 0 && (
        <button type="button" className="btn btn-secondary btn-sm ms-2" onClick={resetForm}>
          Cancel
        </button>
      )}
    </form>
  );
}
