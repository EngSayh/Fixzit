const express = require('express');
const WorkOrder = require('../models/WorkOrder');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const workOrders = await WorkOrder.find().populate('property').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: workOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const workOrder = await WorkOrder.create(req.body);
    res.status(201).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

