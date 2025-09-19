const express = require('express');
const Employee = require('../models/Employee');

const router = express.Router();

router.get('/employees', async (req, res) => {
  try {
    const list = await Employee.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

