const express = require('express');
const fs = require('fs');
const path = require('path');

const flagsPath = path.join(__dirname, '../../../config/flags.json');
const NAMESPACES = ['ui', 'transport', 'perf'];

module.exports = () => {
  const router = express.Router();

  router.get('/flags', (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    fs.readFile(flagsPath, 'utf8', (err, data) => {
      if (err) return next(err);
      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (e) {
        next(e);
      }
    });
  });

  router.put('/flags', (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const { level = 'global', id, namespace, key, value } = req.body || {};
    if (!NAMESPACES.includes(namespace) || !key)
      return res.status(400).send('Invalid flag');
    fs.readFile(flagsPath, 'utf8', (err, data) => {
      if (err) return next(err);
      let flags;
      try {
        flags = JSON.parse(data);
      } catch (e) {
        return next(e);
      }
      const scope = flags[level] || (flags[level] = {});
      let target = scope;
      if (level !== 'global') {
        if (!id) return res.status(400).send('Missing id');
        scope[id] = scope[id] || {};
        target = scope[id];
      }
      target[namespace] = target[namespace] || {};
      if (value === null || value === undefined) {
        delete target[namespace][key];
      } else {
        target[namespace][key] = value;
      }
      fs.writeFile(flagsPath, JSON.stringify(flags, null, 2), (err2) => {
        if (err2) return next(err2);
        res.json({ success: true });
      });
    });
  });

  return router;
};
