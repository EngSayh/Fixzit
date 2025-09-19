const express = require('express');
const Property = require('../models/Property');
const WorkOrder = require('../models/WorkOrder');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const p1 = await Property.create({
      name: 'Al Olaya Business Tower',
      address: 'Al Olaya, Riyadh',
      type: 'commercial',
      units: 450,
      occupancyRate: 96.2,
      monthlyRevenueSar: 890000,
      city: 'Riyadh',
    });
    const p2 = await Property.create({
      name: 'Green Valley Residences',
      address: 'North Ring Road, Riyadh',
      type: 'residential',
      units: 120,
      occupancyRate: 89.5,
      monthlyRevenueSar: 640000,
      city: 'Riyadh',
    });

    await WorkOrder.create({
      code: 'WO-2025-0001',
      title: 'HVAC Maintenance',
      description: 'Quarterly HVAC maintenance',
      priority: 'HIGH',
      status: 'NEW',
      property: p1._id,
      assignedTo: 'Ahmed Ali',
    });

    await WorkOrder.create({
      code: 'WO-2025-0002',
      title: 'Plumbing Issue',
      description: 'Leak in Building B',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      property: p2._id,
      assignedTo: 'Sarah Ahmad',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

