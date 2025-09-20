const express = require('express');
const FinanceMetric = require('../models/FinanceMetric');

const router = express.Router();

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await FinanceMetric.find();
    const map = Object.fromEntries(metrics.map(m => [m.key, m.value]));
    res.json({ success: true, data: map });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

