import { useState, useEffect, useCallback } from 'react';

export const EMPTY_FORM = {
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

export default function useEmployeeForm(defaultRole = '') {
  const [form, setForm] = useState({ ...EMPTY_FORM, role: defaultRole });
  const [editIndex, setEditIndex] = useState(-1);

  useEffect(() => {
    setForm((f) => ({ ...f, role: defaultRole }));
  }, [defaultRole]);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, role: defaultRole });
    setEditIndex(-1);
  }, [defaultRole]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }, []);

  return { form, setForm, editIndex, setEditIndex, resetForm, handleChange };
}
