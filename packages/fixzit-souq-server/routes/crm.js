const express = require('express');
const Customer = require('../models/Customer');

const router = express.Router();

router.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

