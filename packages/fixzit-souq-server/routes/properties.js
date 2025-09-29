const express = require('express');
const Property = require('../models/Property');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

