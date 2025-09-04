const express = require('express');

const router = express.Router();

// Minimal module discovery for admin panels. Returns core groups/modules
// so the AdminPanels view has a useful default, and plugins can augment.
router.get('/modules', (req, res) => {
  res.json({
    groups: [
      { category: 'configuration', modules: ['menu', 'stations'] },
      { category: 'inventory', modules: ['inventory'] },
    ],
  });
});

module.exports = router;
