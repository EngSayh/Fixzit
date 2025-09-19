const express = require('express');
const ComplianceDoc = require('../models/ComplianceDoc');

const router = express.Router();

router.get('/docs', async (req, res) => {
  try {
    const docs = await ComplianceDoc.find().sort({ expiry: 1 }).limit(200);
    res.json({ success: true, data: docs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

