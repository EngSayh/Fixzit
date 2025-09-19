const express = require('express');
const MaintenanceSchedule = require('../models/MaintenanceSchedule');
const Asset = require('../models/Asset');

const router = express.Router();

// Get all maintenance schedules
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await MaintenanceSchedule.find()
      .populate('assetId', 'name type category')
      .populate('propertyId', 'name address')
      .sort({ nextDue: 1 });
    res.json({ success: true, data: schedules });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create new maintenance schedule
router.post('/schedules', async (req, res) => {
  try {
    const asset = await Asset.findById(req.body.assetId);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    const schedule = new MaintenanceSchedule({
      ...req.body,
      assetName: asset.name,
      assetType: asset.type,
      propertyId: asset.propertyId,
      propertyName: asset.propertyName,
      nextDue: req.body.nextDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 1 week
    });
    
    await schedule.save();
    
    // Add to asset's maintenance schedules
    asset.maintenanceSchedules.push(schedule._id);
    await asset.save();
    
    res.json({ success: true, data: schedule });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Complete maintenance task
router.post('/schedules/:id/complete', async (req, res) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    
    // Add to history
    schedule.history.push({
      date: new Date(),
      performedBy: req.body.performedBy || req.user?.name || 'System',
      duration: req.body.duration || schedule.estimatedDuration,
      cost: req.body.cost || schedule.estimatedCost,
      notes: req.body.notes || '',
      issues: req.body.issues || []
    });
    
    // Update schedule
    schedule.lastPerformed = new Date();
    schedule.nextDue = schedule.calculateNextDue();
    schedule.status = 'scheduled';
    
    // Update checklist items if provided
    if (req.body.checklistItems) {
      schedule.checklistItems = req.body.checklistItems;
    }
    
    await schedule.save();
    
    // Update asset total maintenance cost
    const asset = await Asset.findById(schedule.assetId);
    if (asset) {
      asset.totalMaintenanceCost += req.body.cost || schedule.estimatedCost;
      await asset.save();
    }
    
    res.json({ success: true, data: schedule });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get all assets
router.get('/assets', async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate('propertyId', 'name address')
      .populate('maintenanceSchedules')
      .sort({ name: 1 });
    res.json({ success: true, data: assets });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create new asset
router.post('/assets', async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    res.json({ success: true, data: asset });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get preventive maintenance stats
router.get('/stats', async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments({ status: 'active' });
    const scheduledMaintenance = await MaintenanceSchedule.countDocuments({ status: 'scheduled' });
    const overdueTasks = await MaintenanceSchedule.countDocuments({ status: 'overdue' });
    
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcomingThisWeek = await MaintenanceSchedule.countDocuments({
      status: 'scheduled',
      nextDue: { $lte: weekFromNow }
    });
    
    const completedThisMonth = await MaintenanceSchedule.countDocuments({
      status: 'completed',
      lastPerformed: { $gte: new Date(new Date().setDate(1)) }
    });
    
    const totalThisMonth = await MaintenanceSchedule.countDocuments({
      nextDue: { $gte: new Date(new Date().setDate(1)) }
    });
    
    const completionRate = totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;
    
    const monthlySpend = await MaintenanceSchedule.aggregate([
      {
        $match: {
          lastPerformed: { $gte: new Date(new Date().setDate(1)) }
        }
      },
      {
        $unwind: '$history'
      },
      {
        $match: {
          'history.date': { $gte: new Date(new Date().setDate(1)) }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$history.cost' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalAssets,
        scheduledMaintenance,
        overdueTasks,
        completionRate,
        avgCompletionTime: 2.5, // Placeholder
        monthlySpend: monthlySpend[0]?.total || 0,
        ytdSpend: 125000, // Placeholder
        costSavings: 15000, // Placeholder
        upcomingThisWeek,
        complianceRate: 92 // Placeholder
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;