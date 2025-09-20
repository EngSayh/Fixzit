const express = require('express');
const ComplianceDoc = require('../models/ComplianceDoc');
const Violation = require('../models/Violation');

const router = express.Router();

// Get all compliance documents
router.get('/documents', async (req, res) => {
  try {
    const docs = await ComplianceDoc.find()
      .populate('propertyId', 'name address')
      .sort({ expiryDate: 1 });
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new compliance document
router.post('/documents', async (req, res) => {
  try {
    const newDoc = new ComplianceDoc(req.body);
    await newDoc.save();
    res.json({ success: true, data: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Renew document
router.post('/documents/:id/renew', async (req, res) => {
  try {
    const doc = await ComplianceDoc.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Create renewal logic
    doc.status = 'pending';
    doc.renewalDate = new Date();
    await doc.save();
    
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get violations
router.get('/violations', async (req, res) => {
  try {
    const violations = await Violation.find()
      .populate('propertyId', 'name address')
      .sort({ dueDate: 1 });
    res.json({ success: true, data: violations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create violation
router.post('/violations', async (req, res) => {
  try {
    const violation = new Violation(req.body);
    await violation.save();
    res.json({ success: true, data: violation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get compliance stats
router.get('/stats', async (req, res) => {
  try {
    const totalDocuments = await ComplianceDoc.countDocuments();
    const validDocuments = await ComplianceDoc.countDocuments({ status: 'valid' });
    const expiringDocuments = await ComplianceDoc.countDocuments({ 
      status: 'expiring',
      expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });
    const expiredDocuments = await ComplianceDoc.countDocuments({ status: 'expired' });
    const openViolations = await Violation.countDocuments({ status: { $in: ['open', 'overdue'] } });
    
    const complianceRate = totalDocuments > 0 ? Math.round((validDocuments / totalDocuments) * 100) : 0;
    
    // Count upcoming inspections
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingInspections = await ComplianceDoc.countDocuments({
      nextInspectionDate: { 
        $gte: new Date(),
        $lte: thirtyDaysFromNow 
      }
    });
    
    res.json({
      success: true,
      data: {
        totalDocuments,
        validDocuments,
        expiringDocuments,
        expiredDocuments,
        pendingRenewals: expiringDocuments,
        complianceRate,
        upcomingInspections,
        openViolations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

