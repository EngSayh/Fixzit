const express = require('express');
const SensorReading = require('../models/SensorReading');

const router = express.Router();

router.get('/readings', async (req, res) => {
  try {
    const readings = await SensorReading.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: readings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

