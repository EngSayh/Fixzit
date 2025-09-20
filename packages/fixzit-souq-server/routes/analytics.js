const express = require('express');
const AnalyticsMetric = require('../models/AnalyticsMetric');

const router = express.Router();

router.get('/metrics', async (req, res) => {
  try {
    const list = await AnalyticsMetric.find();
    const data = Object.fromEntries(list.map(m => [m.key, m.value]));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

