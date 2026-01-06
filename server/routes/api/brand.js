const express = require('express');
const path = require('path');
const fs = require('fs');

module.exports = () => {
  const router = express.Router();

  router.post('/brand/upload', express.json({ limit: '5mb' }), async (req, res) => {
    try {
      const { name, data } = req.body || {};
      if (!data || typeof data !== 'string') return res.status(400).json({ error: 'Invalid data' });
      // data can be a data URL or raw base64; support both
      const match = String(data).match(/^data:(.*?);base64,(.*)$/);
      const base64 = match ? match[2] : data;
      const buf = Buffer.from(base64, 'base64');
      const safeName = String(name || 'asset').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const dir = path.join(process.cwd(), 'public', 'uploads', 'branding');
      fs.mkdirSync(dir, { recursive: true });
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, buf);
      const url = `/uploads/branding/${fileName}`;
      return res.json({ url });
    } catch (err) {
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  return router;
};

