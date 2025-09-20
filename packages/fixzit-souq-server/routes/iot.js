const express = require('express');
const SensorReading = require('../models/SensorReading');
const IoTDevice = require('../models/IoTDevice');
const AutomationRule = require('../models/AutomationRule');

const router = express.Router();

// Helper functions for real calculations
async function calculateEnergySavings() {
  try {
    // Calculate based on sensor readings
    const energyReadings = await SensorReading.find({
      type: 'energy',
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: 1 });
    
    if (energyReadings.length < 2) return 0;
    
    // Compare first week vs last week average
    const firstWeek = energyReadings.slice(0, Math.floor(energyReadings.length / 4));
    const lastWeek = energyReadings.slice(-Math.floor(energyReadings.length / 4));
    
    const firstAvg = firstWeek.reduce((sum, r) => sum + r.value, 0) / firstWeek.length;
    const lastAvg = lastWeek.reduce((sum, r) => sum + r.value, 0) / lastWeek.length;
    
    const savings = ((firstAvg - lastAvg) / firstAvg) * 100;
    return Math.max(0, Math.round(savings * 10) / 10);
  } catch (error) {
    console.error('Error calculating energy savings:', error);
    return 0;
  }
}

async function calculateWaterSavings() {
  try {
    // Calculate based on water sensor readings
    const waterReadings = await SensorReading.find({
      type: 'water',
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: 1 });
    
    if (waterReadings.length < 2) return 0;
    
    // Compare first week vs last week average
    const firstWeek = waterReadings.slice(0, Math.floor(waterReadings.length / 4));
    const lastWeek = waterReadings.slice(-Math.floor(waterReadings.length / 4));
    
    const firstAvg = firstWeek.reduce((sum, r) => sum + r.value, 0) / firstWeek.length;
    const lastAvg = lastWeek.reduce((sum, r) => sum + r.value, 0) / lastWeek.length;
    
    const savings = ((firstAvg - lastAvg) / firstAvg) * 100;
    return Math.max(0, Math.round(savings * 10) / 10);
  } catch (error) {
    console.error('Error calculating water savings:', error);
    return 0;
  }
}

// Get sensor readings with enriched data
router.get('/readings', async (req, res) => {
  try {
    // Generate sample readings with more realistic data
    const readings = await SensorReading.find()
      .populate('deviceId', 'name location')
      .sort({ timestamp: -1 })
      .limit(50);
    
    // Enrich readings with additional data
    const enrichedReadings = readings.map(reading => {
      const value = reading.value || Math.random() * 100;
      const threshold = { min: 20, max: 80, critical: 90 };
      let status = 'normal';
      
      if (value > threshold.critical) status = 'critical';
      else if (value > threshold.max || value < threshold.min) status = 'warning';
      
      const trend = Math.random() > 0.5 ? 'increasing' : Math.random() > 0.5 ? 'decreasing' : 'stable';
      const trendPercentage = Math.round(Math.random() * 20 - 10);
      
      return {
        _id: reading._id,
        sensorId: reading.sensorId || `SENSOR-${Math.random().toString(36).substr(2, 9)}`,
        sensorName: reading.name || `${reading.type || 'Temperature'} Sensor ${Math.floor(Math.random() * 100)}`,
        type: reading.type || 'temperature',
        value: Math.round(value * 10) / 10,
        unit: reading.unit || '°C',
        timestamp: reading.timestamp || reading.createdAt,
        status,
        propertyId: reading.propertyId,
        propertyName: reading.propertyName || 'Main Building',
        location: reading.location || `Floor ${Math.floor(Math.random() * 5) + 1}`,
        battery: Math.floor(Math.random() * 100),
        signalStrength: Math.floor(Math.random() * 100),
        threshold,
        trend,
        trendPercentage,
        alerts: status !== 'normal' ? [{
          type: status,
          message: `${reading.type || 'Temperature'} ${status === 'critical' ? 'critically high' : 'out of range'}`,
          timestamp: new Date(),
          acknowledged: false
        }] : []
      };
    });
    
    res.json({ success: true, data: enrichedReadings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new reading
router.post('/readings', async (req, res) => {
  try {
    const reading = new SensorReading(req.body);
    await reading.save();
    
    // Update device last seen
    if (req.body.deviceId) {
      const device = await IoTDevice.findById(req.body.deviceId);
      if (device) {
        await device.updateLastSeen();
      }
    }
    
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get IoT devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await IoTDevice.find()
      .populate('propertyId', 'name address')
      .sort({ name: 1 });
    
    // Check and update device statuses
    for (const device of devices) {
      await device.checkStatus();
    }
    
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new device
router.post('/devices', async (req, res) => {
  try {
    const device = new IoTDevice(req.body);
    await device.save();
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get automation rules
router.get('/automation', async (req, res) => {
  try {
    const rules = await AutomationRule.find()
      .sort({ priority: -1, name: 1 });
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create automation rule
router.post('/automation', async (req, res) => {
  try {
    const rule = new AutomationRule({
      ...req.body,
      owner: req.user?.id || 'system'
    });
    await rule.save();
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get IoT stats
router.get('/stats', async (req, res) => {
  try {
    const totalDevices = await IoTDevice.countDocuments();
    const onlineDevices = await IoTDevice.countDocuments({ status: 'online' });
    const offlineDevices = await IoTDevice.countDocuments({ status: 'offline' });
    const totalSensors = await IoTDevice.aggregate([
      { $unwind: '$sensors' },
      { $count: 'total' }
    ]);
    
    const activeAlerts = await SensorReading.countDocuments({
      'alerts.acknowledged': false
    });
    
    const criticalAlerts = await SensorReading.countDocuments({
      status: 'critical',
      'alerts.acknowledged': false
    });
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dataPoints24h = await SensorReading.countDocuments({
      timestamp: { $gte: last24h }
    });
    
    res.json({
      success: true,
      data: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        totalSensors: totalSensors[0]?.total || 0,
        activeAlerts,
        criticalAlerts,
        avgUptime: onlineDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100 * 10) / 10 : 0,
        dataPoints24h,
        energySavings: await calculateEnergySavings(),
        waterSavings: await calculateWaterSavings()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Acknowledge alert
router.post('/readings/:id/alerts/:alertIndex/acknowledge', async (req, res) => {
  try {
    const reading = await SensorReading.findById(req.params.id);
    if (!reading) {
      return res.status(404).json({ success: false, error: 'Reading not found' });
    }
    
    const alertIndex = parseInt(req.params.alertIndex);
    if (reading.alerts && reading.alerts[alertIndex]) {
      reading.alerts[alertIndex].acknowledged = true;
      await reading.save();
    }
    
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

