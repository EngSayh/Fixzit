#!/usr/bin/env node

/**
 * PHASE 1 TRUTH VERIFIER
 * This will expose if the "100% complete" claim is REAL or FAKE
 * Run this to see the ACTUAL implementation status
 */

const axios = require('axios');
const fs = require('fs');

console.log("\n🔍 VERIFYING PHASE 1 '100% COMPLETE' CLAIM");
console.log("=".repeat(70));

// Track real vs fake
const results = {
  claimed: [],
  real: [],
  fake: [],
  missing: []
};

async function verifyModule(moduleName, tests) {
  console.log(`\n📦 Testing ${moduleName}...`);
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result.real) {
        console.log(`  ✅ REAL: ${result.message}`);
        results.real.push(`${moduleName}: ${result.message}`);
      } else {
        console.log(`  ❌ FAKE: ${result.message}`);
        results.fake.push(`${moduleName}: ${result.message}`);
      }
    } catch (error) {
      console.log(`  ❌ MISSING: ${error.message}`);
      results.missing.push(`${moduleName}: ${error.message}`);
    }
  }
}

// TEST EACH MODULE'S ACTUAL FUNCTIONALITY
async function runVerification() {
  
  // 1. WORK ORDERS MODULE
  await verifyModule("Work Orders", [
    async () => {
      // Create a real work order
      const res = await axios.post('http://localhost:5000/api/workorders', {
        title: 'Test WO',
        description: 'Testing',
        priority: 'high',
        propertyId: 'prop123',
        category: 'HVAC'
      });
      const data = res.data;
      
      // Check if it returns real data or placeholder
      if (data.data && data.data._id && data.data.slaBreachTime) {
        // Try to retrieve it
        const get = await axios.get(`http://localhost:5000/api/workorders/${data.data._id}`);
        const retrieved = get.data;
        
        if (retrieved.data && retrieved.data.title === 'Test WO') {
          return { real: true, message: "Creates & retrieves real work orders with SLA" };
        }
      }
      
      if (data.message) {
        return { real: false, message: "Returns placeholder message instead of WO" };
      }
      
      return { real: false, message: "No SLA calculation or proper fields" };
    },
    
    async () => {
      // Test auto-assignment
      const res = await axios.post('http://localhost:5000/api/workorders/test-auto-assign', {
        category: 'HVAC'
      });
      
      if (res.status === 200) {
        const data = res.data;
        if (data.assignedTo) {
          return { real: true, message: "Auto-assignment working" };
        }
      }
      return { real: false, message: "No auto-assignment logic" };
    }
  ]);
  
  // 2. PROPERTIES MODULE
  await verifyModule("Properties", [
    async () => {
      // Create property with units
      const res = await axios.post('http://localhost:5000/api/properties', {
        name: 'Test Building',
        units: [
          { number: '101', type: '2BR', rent: 3000 },
          { number: '102', type: '3BR', rent: 4000 }
        ]
      });
      const data = res.data;
      
      if (data.data && data.data.units && data.data.units.length === 2) {
        return { real: true, message: "Properties with units working" };
      }
      
      if (data.message) {
        return { real: false, message: "Returns message, not property data" };
      }
      
      return { real: false, message: "Units management not implemented" };
    },
    
    async () => {
      // Test tenant assignment
      const res = await axios.post('http://localhost:5000/api/properties/units/test/assign-tenant', {
        tenantName: 'John Doe'
      });
      
      if (res.status === 200) {
        return { real: true, message: "Tenant assignment working" };
      }
      return { real: false, message: "No tenant management" };
    }
  ]);
  
  // 3. FINANCE MODULE - ZATCA
  await verifyModule("Finance/ZATCA", [
    async () => {
      // Create invoice with ZATCA
      const res = await axios.post('http://localhost:5000/api/finance/invoices', {
        customerName: 'Test Customer',
        items: [{ description: 'Service', amount: 100, tax: 15 }],
        total: 115
      });
      const data = res.data;
      
      // Check for ZATCA QR code
      if (data.data && data.data.qrCode) {
        // Verify it's a real base64 QR code
        if (data.data.qrCode.length > 100 && data.data.qrCode.includes('AQIF')) {
          return { real: true, message: "ZATCA QR code generation working" };
        }
        return { real: false, message: "Fake QR code (not ZATCA compliant)" };
      }
      
      if (data.message) {
        return { real: false, message: "Placeholder response, no ZATCA" };
      }
      
      return { real: false, message: "ZATCA not implemented" };
    }
  ]);
  
  // 4. MARKETPLACE MODULE
  await verifyModule("Marketplace", [
    async () => {
      // Create RFQ
      const rfq = await axios.post('http://localhost:5000/api/marketplace/rfq', {
        title: 'Test RFQ',
        deadline: new Date()
      });
      const rfqData = rfq.data;
      
      if (rfqData.data && rfqData.data._id) {
        // Submit bid
        const bid = await axios.post(`http://localhost:5000/api/marketplace/rfq/${rfqData.data._id}/bids`, {
          amount: 1000
        });
        
        if (bid.status === 200) {
          // Award bid
          const award = await axios.post(`http://localhost:5000/api/marketplace/rfq/${rfqData.data._id}/award`);
          
          if (award.status === 200) {
            return { real: true, message: "Complete RFQ→Bid→Award flow working" };
          }
          return { real: false, message: "Award process not working" };
        }
        return { real: false, message: "Bidding not implemented" };
      }
      
      if (rfqData.message) {
        return { real: false, message: "Returns placeholder message" };
      }
      
      return { real: false, message: "RFQ system not implemented" };
    }
  ]);
  
  // 5. THREE GOLDEN WORKFLOWS
  await verifyModule("Golden Workflows", [
    async () => {
      // Workflow 1: Tenant → Ticket → WO → Auto-assign
      const ticket = await axios.post('http://localhost:5000/api/support/tickets', {
        type: 'maintenance',
        title: 'AC broken'
      });
      const data = ticket.data;
      
      if (data.data && data.data.workOrderId && data.data.assignedTechnician) {
        return { real: true, message: "Tenant workflow fully connected" };
      }
      return { real: false, message: "Workflow not connected" };
    },
    
    async () => {
      // Workflow 2: RFQ → PO
      const res = await axios.get('http://localhost:5000/api/marketplace/test-workflow');
      if (res.status === 200) {
        const data = res.data;
        if (data.purchaseOrderGenerated) {
          return { real: true, message: "RFQ to PO workflow complete" };
        }
      }
      return { real: false, message: "RFQ to PO not working" };
    },
    
    async () => {
      // Workflow 3: DoA Approval
      const wo = await axios.post('http://localhost:5000/api/workorders', {
        title: 'High value',
        estimatedCost: 100000
      });
      const data = wo.data;
      
      if (data.data && data.data.requiresApproval && data.data.approvalStatus === 'pending') {
        return { real: true, message: "DoA approval flow working" };
      }
      return { real: false, message: "No DoA implementation" };
    }
  ]);
  
  // 6. CHECK FOR PLACEHOLDER CODE
  console.log("\n🔍 Checking for Placeholder Code...");
  const filesToCheck = [
    'routes/workorders.js',
    'routes/properties.js', 
    'routes/finance.js',
    'routes/marketplace.js'
  ];
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('res.json({ message:') || 
          content.includes('res.send("') ||
          content.includes('// TODO') ||
          content.includes('return { success: true }')) {
        results.fake.push(`${file}: Contains placeholder code`);
      }
    } else {
      results.missing.push(`${file}: File doesn't exist`);
    }
  });
}

// Run verification and show results
async function main() {
  await runVerification();
  
  // Calculate real completion
  const total = results.real.length + results.fake.length + results.missing.length;
  const realPercentage = Math.round((results.real.length / total) * 100);
  
  console.log("\n" + "=".repeat(70));
  console.log("📊 PHASE 1 VERIFICATION RESULTS");
  console.log("=".repeat(70));
  
  console.log("\n🎭 CLAIMED vs REALITY:");
  console.log("  Claimed: ✅ 100% Complete");
  console.log(`  Reality: ${realPercentage}% Actually Working`);
  
  console.log("\n✅ REAL IMPLEMENTATIONS (" + results.real.length + "):");
  results.real.forEach(r => console.log("  • " + r));
  
  console.log("\n❌ FAKE/PLACEHOLDER (" + results.fake.length + "):");
  results.fake.forEach(f => console.log("  • " + f));
  
  console.log("\n⚠️ MISSING COMPLETELY (" + results.missing.length + "):");
  results.missing.forEach(m => console.log("  • " + m));
  
  console.log("\n" + "=".repeat(70));
  
  if (realPercentage >= 90) {
    console.log("✅ VERDICT: Phase 1 is ACTUALLY complete!");
  } else if (realPercentage >= 50) {
    console.log("⚠️ VERDICT: Partial implementation - needs completion");
  } else {
    console.log("❌ VERDICT: FALSE CLAIM - System is mostly placeholders!");
    console.log("\n📌 REQUIRED ACTION:");
    console.log("1. STOP claiming completion");
    console.log("2. SEARCH chat history for complete code");
    console.log("3. IMPLEMENT the actual functionality");
    console.log("4. Run this verification again");
  }
  
  console.log("\n💡 To fix: Search chat history for the complete implementations");
  console.log("The code is already written - just find and use it!");
  console.log("=".repeat(70));
}

// Execute
main().catch(err => {
  console.error("❌ Critical error:", err.message);
  console.log("Server might not be running or major configuration issue");
});
