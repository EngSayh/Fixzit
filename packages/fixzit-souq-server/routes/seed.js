const express = require('express');
const Property = require('../models/Property');
const WorkOrder = require('../models/WorkOrder');
const Employee = require('../models/Employee');
const FinanceMetric = require('../models/FinanceMetric');
const SupportTicket = require('../models/SupportTicket');
const MarketplaceItem = require('../models/MarketplaceItem');

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

    await Employee.create([
      { employeeId: 'EMP-001', name: 'Mohammed Al-Khalid', department: 'Maintenance', status: 'Active' },
      { employeeId: 'EMP-002', name: 'Fatima Al-Zahra', department: 'Property Management', status: 'Active' },
    ]);

    await FinanceMetric.deleteMany({});
    await FinanceMetric.create([
      { key: 'totalAssets', value: 125000000 },
      { key: 'monthlyIncome', value: 4800000 },
      { key: 'operatingExpenses', value: 1200000 },
      { key: 'netProfitMargin', value: 24.8, unit: '%' },
    ]);

    await SupportTicket.create([
      { subject: 'Cannot access invoice', status: 'OPEN', responseTimeHours: 3.1 },
      { subject: 'Elevator outage', status: 'IN_PROGRESS', responseTimeHours: 2.4 },
    ]);

    await MarketplaceItem.create([
      { name: 'Industrial AC Unit - 5 Ton', priceSar: 12500, vendor: 'CoolTech Solutions', category: 'HVAC Equipment' },
      { name: 'Professional Tool Set', priceSar: 850, vendor: 'ProTools KSA', category: 'Tools' },
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

