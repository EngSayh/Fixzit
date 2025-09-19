const express = require('express');
const SupportTicket = require('../models/SupportTicket');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const open = await SupportTicket.countDocuments({ status: 'OPEN' });
    const avgResponse = await SupportTicket.aggregate([
      { $group: { _id: null, avg: { $avg: '$responseTimeHours' } } }
    ]);
    const avg = avgResponse?.[0]?.avg || 0;
    const resolutionRate = 0.94; // placeholder, could be computed
    res.json({ success: true, data: { open, avgResponseHours: avg, resolutionRate } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

