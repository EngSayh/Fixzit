// Initialize FIXZIT SOUQ Database
db = db.getSiblingDB('fixzit_souq');

// Create collections
db.createCollection('properties');
db.createCollection('workorders');
db.createCollection('employees');
db.createCollection('customers');
db.createCollection('supporttickets');
db.createCollection('marketplaceitems');
db.createCollection('compliancedocs');
db.createCollection('analyticsmetrics');
db.createCollection('financemetrics');
db.createCollection('systemsettings');

// Create indexes for better performance
db.properties.createIndex({ "name": 1 });
db.properties.createIndex({ "city": 1 });
db.properties.createIndex({ "type": 1 });

db.workorders.createIndex({ "code": 1 }, { unique: true });
db.workorders.createIndex({ "status": 1 });
db.workorders.createIndex({ "priority": 1 });

db.employees.createIndex({ "email": 1 }, { unique: true });
db.employees.createIndex({ "department": 1 });

db.customers.createIndex({ "email": 1 });
db.customers.createIndex({ "type": 1 });

db.supporttickets.createIndex({ "ticketNumber": 1 }, { unique: true });
db.supporttickets.createIndex({ "status": 1 });
db.supporttickets.createIndex({ "priority": 1 });

db.marketplaceitems.createIndex({ "name": 1 });
db.marketplaceitems.createIndex({ "category": 1 });
db.marketplaceitems.createIndex({ "vendor": 1 });

db.compliancedocs.createIndex({ "title": 1 });
db.compliancedocs.createIndex({ "type": 1 });
db.compliancedocs.createIndex({ "expiryDate": 1 });

db.analyticsmetrics.createIndex({ "metric": 1 });
db.analyticsmetrics.createIndex({ "date": 1 });

db.financemetrics.createIndex({ "metric": 1 });
db.financemetrics.createIndex({ "date": 1 });

db.systemsettings.createIndex({ "key": 1 }, { unique: true });

print('✅ FIXZIT SOUQ Database initialized successfully');
print('📊 Created collections: properties, workorders, employees, customers, supporttickets, marketplaceitems, compliancedocs, analyticsmetrics, financemetrics, systemsettings');
print('🔍 Created indexes for optimal performance');