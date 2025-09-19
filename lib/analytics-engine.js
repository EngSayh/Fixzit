const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

class AnalyticsEngine {
  constructor(database) {
    this.db = database;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Dashboard Analytics
  async getDashboardAnalytics(organizationId, dateRange = {}) {
    const cacheKey = `dashboard_${organizationId}_${JSON.stringify(dateRange)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getDateRange(dateRange);

    const analytics = await Promise.all([
      this.getWorkOrderAnalytics(organizationId, { startDate, endDate }),
      this.getPropertyAnalytics(organizationId, { startDate, endDate }),
      this.getFinancialAnalytics(organizationId, { startDate, endDate }),
      this.getTenantAnalytics(organizationId, { startDate, endDate }),
      this.getMaintenanceAnalytics(organizationId, { startDate, endDate })
    ]);

    const result = {
      workOrders: analytics[0],
      properties: analytics[1],
      financial: analytics[2],
      tenants: analytics[3],
      maintenance: analytics[4],
      generatedAt: new Date(),
      dateRange: { startDate, endDate }
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // Work Order Analytics
  async getWorkOrderAnalytics(organizationId, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const [
      totalWorkOrders,
      completedWorkOrders,
      pendingWorkOrders,
      overdueWorkOrders,
      workOrdersByPriority,
      workOrdersByCategory,
      avgCompletionTime,
      workOrderTrends
    ] = await Promise.all([
      this.db.workOrders.count({
        organizationId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      this.db.workOrders.count({
        organizationId,
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      this.db.workOrders.count({
        organizationId,
        status: { $in: ['pending', 'in_progress'] },
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      this.db.workOrders.count({
        organizationId,
        dueDate: { $lt: new Date() },
        status: { $ne: 'completed' }
      }),
      this.db.workOrders.aggregate([
        {
          $match: {
            organizationId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),
      this.db.workOrders.aggregate([
        {
          $match: {
            organizationId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]),
      this.calculateAvgCompletionTime(organizationId, dateRange),
      this.getWorkOrderTrends(organizationId, dateRange)
    ]);

    const completionRate = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0;
    const slaCompliance = await this.calculateSLACompliance(organizationId, dateRange);

    return {
      total: totalWorkOrders,
      completed: completedWorkOrders,
      pending: pendingWorkOrders,
      overdue: overdueWorkOrders,
      completionRate: Math.round(completionRate * 100) / 100,
      slaCompliance: Math.round(slaCompliance * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
      byPriority: this.formatGroupedData(workOrdersByPriority),
      byCategory: this.formatGroupedData(workOrdersByCategory),
      trends: workOrderTrends
    };
  }

  // Property Analytics
  async getPropertyAnalytics(organizationId, dateRange) {
    const [
      totalProperties,
      occupiedUnits,
      vacantUnits,
      maintenanceRequests,
      avgOccupancyRate,
      revenueByProperty,
      propertyPerformance
    ] = await Promise.all([
      this.db.properties.count({ organizationId }),
      this.db.units.count({ organizationId, status: 'occupied' }),
      this.db.units.count({ organizationId, status: 'vacant' }),
      this.db.workOrders.count({
        organizationId,
        type: 'maintenance',
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.calculateAvgOccupancyRate(organizationId),
      this.getRevenueByProperty(organizationId, dateRange),
      this.getPropertyPerformance(organizationId, dateRange)
    ]);

    const totalUnits = occupiedUnits + vacantUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      avgOccupancyRate: Math.round(avgOccupancyRate * 100) / 100,
      maintenanceRequests,
      revenueByProperty,
      performance: propertyPerformance
    };
  }

  // Financial Analytics
  async getFinancialAnalytics(organizationId, dateRange) {
    const { startDate, endDate } = dateRange;

    const [
      totalRevenue,
      totalExpenses,
      outstandingAmount,
      collectionRate,
      revenueByMonth,
      expensesByCategory,
      profitMargin,
      cashFlow
    ] = await Promise.all([
      this.getTotalRevenue(organizationId, dateRange),
      this.getTotalExpenses(organizationId, dateRange),
      this.getOutstandingAmount(organizationId),
      this.getCollectionRate(organizationId, dateRange),
      this.getRevenueByMonth(organizationId, dateRange),
      this.getExpensesByCategory(organizationId, dateRange),
      this.calculateProfitMargin(organizationId, dateRange),
      this.getCashFlowAnalysis(organizationId, dateRange)
    ]);

    const netIncome = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      outstandingAmount,
      collectionRate: Math.round(collectionRate * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      revenueByMonth,
      expensesByCategory,
      cashFlow
    };
  }

  // Tenant Analytics
  async getTenantAnalytics(organizationId, dateRange) {
    const [
      totalTenants,
      newTenants,
      renewals,
      moveOuts,
      avgLeaseLength,
      tenantSatisfaction,
      leaseExpirations
    ] = await Promise.all([
      this.db.tenants.count({ organizationId }),
      this.db.tenants.count({
        organizationId,
        moveInDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.db.leases.count({
        organizationId,
        renewalDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.db.tenants.count({
        organizationId,
        moveOutDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.calculateAvgLeaseLength(organizationId),
      this.getTenantSatisfactionScore(organizationId),
      this.getUpcomingLeaseExpirations(organizationId)
    ]);

    const retentionRate = totalTenants > 0 ? ((totalTenants - moveOuts) / totalTenants) * 100 : 0;

    return {
      totalTenants,
      newTenants,
      renewals,
      moveOuts,
      retentionRate: Math.round(retentionRate * 100) / 100,
      avgLeaseLength: Math.round(avgLeaseLength * 100) / 100,
      tenantSatisfaction: Math.round(tenantSatisfaction * 100) / 100,
      upcomingExpirations: leaseExpirations
    };
  }

  // Maintenance Analytics
  async getMaintenanceAnalytics(organizationId, dateRange) {
    const [
      totalMaintenanceRequests,
      preventiveMaintenance,
      emergencyMaintenance,
      avgResponseTime,
      maintenanceCosts,
      equipmentReliability
    ] = await Promise.all([
      this.db.maintenanceRequests.count({
        organizationId,
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.db.maintenanceRequests.count({
        organizationId,
        type: 'preventive',
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.db.maintenanceRequests.count({
        organizationId,
        priority: 'emergency',
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }),
      this.calculateAvgResponseTime(organizationId, dateRange),
      this.getMaintenanceCosts(organizationId, dateRange),
      this.getEquipmentReliability(organizationId, dateRange)
    ]);

    return {
      totalRequests: totalMaintenanceRequests,
      preventive: preventiveMaintenance,
      emergency: emergencyMaintenance,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      totalCosts: maintenanceCosts,
      equipmentReliability: Math.round(equipmentReliability * 100) / 100
    };
  }

  // Report Generation
  async generateReport(reportConfig) {
    const {
      type,
      organizationId,
      dateRange,
      format = 'pdf',
      includeCharts = true,
      filters = {}
    } = reportConfig;

    let data;
    switch (type) {
      case 'dashboard':
        data = await this.getDashboardAnalytics(organizationId, dateRange);
        break;
      case 'financial':
        data = await this.getFinancialReport(organizationId, dateRange, filters);
        break;
      case 'operational':
        data = await this.getOperationalReport(organizationId, dateRange, filters);
        break;
      case 'tenant':
        data = await this.getTenantReport(organizationId, dateRange, filters);
        break;
      case 'maintenance':
        data = await this.getMaintenanceReport(organizationId, dateRange, filters);
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    switch (format) {
      case 'pdf':
        return await this.generatePDFReport(data, reportConfig);
      case 'excel':
        return await this.generateExcelReport(data, reportConfig);
      case 'csv':
        return await this.generateCSVReport(data, reportConfig);
      case 'json':
        return { format: 'json', data };
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  // PDF Report Generation
  async generatePDFReport(data, config) {
    const doc = new PDFDocument();
    const filename = `${config.type}_report_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../reports', filename);

    doc.pipe(require('fs').createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('Fixzit Enterprise', 50, 50);
    doc.fontSize(16).text(`${config.type.toUpperCase()} REPORT`, 50, 80);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 110);
    doc.text(`Period: ${config.dateRange.startDate.toLocaleDateString()} - ${config.dateRange.endDate.toLocaleDateString()}`, 50, 130);

    let yPosition = 170;

    // Add content based on report type
    if (config.type === 'dashboard') {
      yPosition = this.addDashboardContentToPDF(doc, data, yPosition);
    } else if (config.type === 'financial') {
      yPosition = this.addFinancialContentToPDF(doc, data, yPosition);
    }

    // Footer
    doc.fontSize(10).text('© 2025 Fixzit Enterprise. All rights reserved.', 50, doc.page.height - 50);

    doc.end();

    return {
      format: 'pdf',
      filename,
      filepath,
      size: await this.getFileSize(filepath)
    };
  }

  // Excel Report Generation
  async generateExcelReport(data, config) {
    const workbook = new ExcelJS.Workbook();
    const filename = `${config.type}_report_${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, '../reports', filename);

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
      { header: 'Change', key: 'change', width: 15 }
    ];

    // Add data based on report type
    if (config.type === 'dashboard') {
      this.addDashboardDataToExcel(summarySheet, data);
    } else if (config.type === 'financial') {
      this.addFinancialDataToExcel(summarySheet, data);
    }

    // Charts sheet (if requested)
    if (config.includeCharts) {
      const chartsSheet = workbook.addWorksheet('Charts');
      // Add chart data
    }

    await workbook.xlsx.writeFile(filepath);

    return {
      format: 'excel',
      filename,
      filepath,
      size: await this.getFileSize(filepath)
    };
  }

  // CSV Report Generation
  async generateCSVReport(data, config) {
    const filename = `${config.type}_report_${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../reports', filename);

    let csvData;
    if (config.type === 'dashboard') {
      csvData = this.formatDashboardDataForCSV(data);
    } else if (config.type === 'financial') {
      csvData = this.formatFinancialDataForCSV(data);
    }

    const parser = new Parser();
    const csv = parser.parse(csvData);

    await fs.writeFile(filepath, csv);

    return {
      format: 'csv',
      filename,
      filepath,
      size: await this.getFileSize(filepath)
    };
  }

  // Predictive Analytics
  async getPredictiveAnalytics(organizationId, type, horizon = 12) {
    switch (type) {
      case 'revenue':
        return await this.predictRevenue(organizationId, horizon);
      case 'occupancy':
        return await this.predictOccupancy(organizationId, horizon);
      case 'maintenance':
        return await this.predictMaintenance(organizationId, horizon);
      default:
        throw new Error(`Unknown prediction type: ${type}`);
    }
  }

  async predictRevenue(organizationId, months) {
    // Simple linear regression for revenue prediction
    const historicalData = await this.getHistoricalRevenue(organizationId, 24);
    const prediction = this.linearRegression(historicalData, months);
    
    return {
      type: 'revenue',
      horizon: months,
      predictions: prediction,
      confidence: this.calculateConfidence(historicalData),
      trend: this.calculateTrend(historicalData)
    };
  }

  // Real-time Analytics
  async getRealTimeAnalytics(organizationId) {
    const [
      activeWorkOrders,
      onlineTechnicians,
      emergencyAlerts,
      systemHealth,
      currentOccupancy
    ] = await Promise.all([
      this.db.workOrders.count({
        organizationId,
        status: 'in_progress'
      }),
      this.getOnlineTechnicians(organizationId),
      this.db.alerts.count({
        organizationId,
        priority: 'emergency',
        status: 'active'
      }),
      this.getSystemHealth(organizationId),
      this.getCurrentOccupancy(organizationId)
    ]);

    return {
      activeWorkOrders,
      onlineTechnicians,
      emergencyAlerts,
      systemHealth,
      currentOccupancy,
      lastUpdated: new Date()
    };
  }

  // Utility Methods
  getDateRange(dateRange) {
    const endDate = dateRange.endDate || new Date();
    const startDate = dateRange.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return { startDate, endDate };
  }

  formatGroupedData(aggregationResult) {
    return aggregationResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  linearRegression(data, periods) {
    // Simple linear regression implementation
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = data.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictions = [];
    for (let i = n; i < n + periods; i++) {
      predictions.push(slope * i + intercept);
    }

    return predictions;
  }

  calculateTrend(data) {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  calculateConfidence(data) {
    // Simple confidence calculation based on data variance
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / mean) * 100));
    return Math.round(confidence);
  }

  // Abstract methods to be implemented based on your database structure
  async calculateAvgCompletionTime(organizationId, dateRange) { return 24; }
  async getWorkOrderTrends(organizationId, dateRange) { return []; }
  async calculateSLACompliance(organizationId, dateRange) { return 95; }
  async calculateAvgOccupancyRate(organizationId) { return 85; }
  async getRevenueByProperty(organizationId, dateRange) { return {}; }
  async getPropertyPerformance(organizationId, dateRange) { return {}; }
  async getTotalRevenue(organizationId, dateRange) { return 100000; }
  async getTotalExpenses(organizationId, dateRange) { return 60000; }
  async getOutstandingAmount(organizationId) { return 25000; }
  async getCollectionRate(organizationId, dateRange) { return 92; }
  async getRevenueByMonth(organizationId, dateRange) { return []; }
  async getExpensesByCategory(organizationId, dateRange) { return {}; }
  async calculateProfitMargin(organizationId, dateRange) { return 40; }
  async getCashFlowAnalysis(organizationId, dateRange) { return {}; }
  async calculateAvgLeaseLength(organizationId) { return 12; }
  async getTenantSatisfactionScore(organizationId) { return 4.2; }
  async getUpcomingLeaseExpirations(organizationId) { return []; }
  async calculateAvgResponseTime(organizationId, dateRange) { return 2.5; }
  async getMaintenanceCosts(organizationId, dateRange) { return 15000; }
  async getEquipmentReliability(organizationId, dateRange) { return 98; }
  async getOnlineTechnicians(organizationId) { return 12; }
  async getSystemHealth(organizationId) { return { status: 'healthy', uptime: 99.9 }; }
  async getCurrentOccupancy(organizationId) { return 87; }
  async getHistoricalRevenue(organizationId, months) { return []; }
}

module.exports = AnalyticsEngine;