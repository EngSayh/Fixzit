const express = require('express');
const MarketplaceItem = require('../models/MarketplaceItem');

const router = express.Router();

router.get('/items', async (req, res) => {
  try {
    const items = await MarketplaceItem.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

