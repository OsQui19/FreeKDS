const express = require('express');
const bcrypt = require('bcrypt');
const { logSecurityEvent } = require('../controllers/securityLog');
const { normalizeRole } = require('../controllers/accessControl');

module.exports = (db) => {
  const router = express.Router();

  router.get('/login', (req, res) => {
    res.render('login');
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

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });

  return router;
};
