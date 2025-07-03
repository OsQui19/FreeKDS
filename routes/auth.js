const express = require('express');
const bcrypt = require('bcrypt');
const { logSecurityEvent } = require('../controllers/securityLog');
const { normalizeRole } = require('../controllers/accessControl');

module.exports = (db) => {
  const router = express.Router();

  router.get('/login', (req, res) => {
    res.render('login');
  });

  router.get('/clock', (req, res) => {
    res.render('clock');
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      await logSecurityEvent(db, 'login', username, '/login', false, req.ip);
      return res.redirect('/login');
    }
    try {
      const [rows] = await db
        .promise()
        .query('SELECT * FROM employees WHERE username=?', [username]);
      if (!rows.length) {
        await logSecurityEvent(db, 'login', username, '/login', false, req.ip);
        return res.redirect('/login');
      }
      const emp = rows[0];
      const ok = await bcrypt.compare(password, emp.password_hash || '');
      if (!ok) {
        await logSecurityEvent(db, 'login', username, '/login', false, req.ip);
        return res.redirect('/login');
      }
      const role = normalizeRole(emp.role) || emp.role;
      req.session.user = { id: emp.id, role };
      await logSecurityEvent(db, 'login', username, '/login', true, req.ip);
      res.redirect('/');
    } catch (err) {
      console.error('Login error', err);
      await logSecurityEvent(db, 'login', username, '/login', false, req.ip);
      res.redirect('/login');
    }
  });

  router.post('/clock', async (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.redirect('/clock');
    try {
      const [rows] = await db
        .promise()
        .query('SELECT * FROM employees');
      let employee = null;
      for (const r of rows) {
        if (r.pin_hash && await bcrypt.compare(pin, r.pin_hash)) {
          employee = r;
          break;
        }
      }
      if (!employee) {
        await logSecurityEvent(db, 'clock', null, '/clock', false, req.ip);
        return res.redirect('/clock');
      }
      req.session.clockUser = { id: employee.id, name: employee.username };
      res.redirect('/clock/dashboard');
    } catch (err) {
      console.error('Clock login error', err);
      res.redirect('/clock');
    }
  });

  router.get('/clock/dashboard', (req, res) => {
    if (!req.session.clockUser) return res.redirect('/clock');
    res.render('clock-dashboard', { employee: req.session.clockUser });
  });

  router.post('/clock/in', async (req, res) => {
    if (!req.session.clockUser) return res.redirect('/clock');
    try {
      await db
        .promise()
        .query('INSERT INTO time_clock (employee_id, clock_in) VALUES (?, NOW())', [req.session.clockUser.id]);
    } catch (err) {
      console.error('Clock in error', err);
    }
    res.redirect('/clock');
  });

  router.post('/clock/out', async (req, res) => {
    if (!req.session.clockUser) return res.redirect('/clock');
    try {
      await db
        .promise()
        .query('UPDATE time_clock SET clock_out=NOW() WHERE employee_id=? AND clock_out IS NULL ORDER BY id DESC LIMIT 1', [req.session.clockUser.id]);
    } catch (err) {
      console.error('Clock out error', err);
    }
    req.session.clockUser = null;
    res.redirect('/clock');
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });

  return router;
};
