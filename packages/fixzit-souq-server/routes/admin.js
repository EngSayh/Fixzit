const express = require('express');
const SystemSetting = require('../models/SystemSetting');

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    const list = await SystemSetting.find();
    const data = Object.fromEntries(list.map(s => [s.key, s.value]));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

