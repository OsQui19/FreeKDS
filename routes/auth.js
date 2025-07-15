const logger = require('../utils/logger');
const express = require('express');
const bcrypt = require('bcrypt');
const { logSecurityEvent } = require('../controllers/securityLog');
const {
  normalizeRole,
  hasLevel,
  getHierarchy,
} = require('../controllers/accessControl');

function dashboardForRole(role) {
  const r = normalizeRole(role);
  if (r === 'boh') return '/stations';
  if (r === 'foh') return '/order';
  return '/admin';
}

module.exports = (db, io) => {
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
      req.session.clockUser = { id: emp.id, name: emp.username, role };
      req.session.pinOnly = false;
      await logSecurityEvent(db, 'login', username, '/login', true, req.ip);
      const topRole = getHierarchy().slice(-1)[0];
      let clockedIn = false;
      try {
        const [cRows] = await db
          .promise()
          .query(
            'SELECT id FROM time_clock WHERE employee_id=? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
            [emp.id],
          );
        if (cRows.length) clockedIn = true;
      } catch (err2) {
        logger.error('Clock status error', err2);
      }
      if (hasLevel(role, topRole) || clockedIn)
        return res.redirect(dashboardForRole(role));
      return res.redirect('/clock/dashboard');
    } catch (err) {
      logger.error('Login error', err);
      await logSecurityEvent(db, 'login', username, '/login', false, req.ip);
      res.redirect('/login');
    }
  });

  router.post('/clock', async (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.redirect('/clock');
    try {
      const [rows] = await db.promise().query('SELECT * FROM employees');
      let employee = null;
      for (const r of rows) {
        if (r.pin_hash && (await bcrypt.compare(pin, r.pin_hash))) {
          employee = r;
          break;
        }
      }
      if (!employee) {
        await logSecurityEvent(db, 'clock', null, '/clock', false, req.ip);
        return res.redirect('/clock');
      }
      const role = normalizeRole(employee.role) || employee.role;
      req.session.clockUser = { id: employee.id, name: employee.username, role };
      req.session.user = { id: employee.id, role };
      req.session.pinOnly = true;
      let clockedIn = false;
      try {
        const [cRows] = await db
          .promise()
          .query(
            'SELECT id FROM time_clock WHERE employee_id=? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
            [employee.id],
          );
        if (cRows.length) clockedIn = true;
      } catch (err2) {
        logger.error('Clock status error', err2);
      }
      if (clockedIn) return res.redirect(dashboardForRole(role));
      return res.redirect('/clock/dashboard');
    } catch (err) {
      logger.error('Clock login error', err);
      res.redirect('/clock');
    }
  });

  router.get('/clock/dashboard', async (req, res) => {
    if (!req.session.clockUser) return res.redirect('/clock');
    let clockedIn = false;
    try {
      const [rows] = await db
        .promise()
        .query(
          'SELECT id FROM time_clock WHERE employee_id=? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
          [req.session.clockUser.id],
        );
      if (rows.length) clockedIn = true;
    } catch (err) {
      logger.error('Clock status check error', err);
    }
    res.render('clock-dashboard', {
      employee: req.session.clockUser,
      clockedIn,
    });
  });

  router.post('/clock/in', async (req, res) => {
    if (!req.session.clockUser) return res.redirect('/clock');
    try {
      const [rows] = await db
        .promise()
        .query(
          'SELECT id FROM time_clock WHERE employee_id=? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
          [req.session.clockUser.id],
        );
      if (!rows.length) {
        const [result] = await db
          .promise()
          .query('INSERT INTO time_clock (employee_id, clock_in) VALUES (?, NOW())', [req.session.clockUser.id]);
        const [recRows] = await db
          .promise()
          .query(
            'SELECT tc.*, e.username AS name FROM time_clock tc JOIN employees e ON tc.employee_id=e.id WHERE tc.id=?',
            [result.insertId],
          );
        if (recRows.length) io.emit('timeUpdated', recRows[0]);
      }
    } catch (err) {
      logger.error('Clock in error', err);
    }
    res.redirect(dashboardForRole(req.session.clockUser.role));
  });

  router.post('/clock/out', async (req, res) => {
    if (!req.session.clockUser) return res.redirect('/clock');
    try {
      const [rows] = await db
        .promise()
        .query(
          'SELECT id FROM time_clock WHERE employee_id=? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
          [req.session.clockUser.id],
        );
      if (rows.length) {
        const recId = rows[0].id;
        await db
          .promise()
          .query(
            'UPDATE time_clock SET clock_out=NOW() WHERE id=?',
            [recId],
          );
        const [recRows] = await db
          .promise()
          .query(
            'SELECT tc.*, e.username AS name FROM time_clock tc JOIN employees e ON tc.employee_id=e.id WHERE tc.id=?',
            [recId],
          );
        if (recRows.length) io.emit('timeUpdated', recRows[0]);
      }
    } catch (err) {
      logger.error('Clock out error', err);
    }
    req.session.clockUser = null;
    if (req.session.pinOnly) {
      req.session.user = null;
      req.session.pinOnly = null;
    }
    res.redirect('/clock');
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });

  return router;
};
