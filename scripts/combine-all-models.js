// combine-all-models.js
const fs = require("fs");

console.log("📦 COMBINING ALL 15 MODELS FROM 3 PARTS...\n");

// Read all three parts
const modelFiles = [
  "./attached_assets/All Project Codes Phase 1/backend-models-complete.js",
  "./attached_assets/All Project Codes Phase 1/backend-models-part2.js",
  "./attached_assets/All Project Codes Phase 1/backend-models-part3.js",
];

let allModelCode = `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

`;

// Extract model schemas from each file
modelFiles.forEach((file, index) => {
  console.log(`Reading Part ${index + 1}: ${file}`);
  const content = fs.readFileSync(file, "utf8");

  // Extract just the schema definitions (between const ModelSchema and before module.exports)
  const schemaMatch = content.match(
    /const \w+Schema = new Schema[\s\S]*?(?=module\.exports|const \w+Schema|$)/g,
  );

  if (schemaMatch) {
    allModelCode += `// ======= PART ${index + 1} MODELS =======\n`;
    allModelCode += schemaMatch.join("\n\n");
    allModelCode += "\n\n";
  }
});

// Add model creation
allModelCode += `
// ======= CREATE ALL MODELS =======
const Organization = mongoose.model('Organization', OrganizationSchema);
const User = mongoose.model('User', UserSchema);
const Property = mongoose.model('Property', PropertySchema);
const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Vendor = mongoose.model('Vendor', VendorSchema);
const RFQ = mongoose.model('RFQ', RFQSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);
const Contract = mongoose.model('Contract', ContractSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);
const Ticket = mongoose.model('Ticket', TicketSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Compliance = mongoose.model('Compliance', ComplianceSchema);
const ReportTemplate = mongoose.model('ReportTemplate', ReportTemplateSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// ======= EXPORT ALL 15 MODELS =======
module.exports = {
  Organization,
  User,
  Property,
  WorkOrder,
  Invoice,
  Vendor,
  RFQ,
  Inventory,
  Contract,
  Employee,
  Ticket,
  Notification,
  Compliance,
  ReportTemplate,
  AuditLog
};
`;

// Save the complete models file
fs.writeFileSync("./models/index.js", allModelCode);
console.log("\n✅ Successfully combined all 15 models into models/index.js");

// List all exported models
console.log("\n📋 Exported Models:");
const modelList = [
  "Organization",
  "User",
  "Property",
  "WorkOrder",
  "Invoice",
  "Vendor",
  "RFQ",
  "Inventory",
  "Contract",
  "Employee",
  "Ticket",
  "Notification",
  "Compliance",
  "ReportTemplate",
  "AuditLog",
];
modelList.forEach((model, i) => console.log(`  ${i + 1}. ${model}`));
