const express = require('express');
const bcrypt = require('bcrypt');

module.exports = (db) => {
  const router = express.Router();

  router.get('/login', (req, res) => {
    res.render('login');
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.redirect('/login');
    try {
      const [rows] = await db
        .promise()
        .query('SELECT * FROM employees WHERE username=?', [username]);
      if (!rows.length) return res.redirect('/login');
      const emp = rows[0];
      const ok = await bcrypt.compare(password, emp.password_hash || '');
      if (!ok) return res.redirect('/login');
      req.session.user = { id: emp.id, role: emp.role };
      res.redirect('/');
    } catch (err) {
      console.error('Login error', err);
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
