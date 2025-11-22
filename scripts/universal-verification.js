const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

async function getAuthToken() {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@fixzit.com',
      password: 'Admin@1234'
    });
    return res.data.token;
  } catch (error) {
    console.log('❌ AUTH FAILED - Backend not running?', error?.message || '');
    return null;
  }
}

async function verifyPhaseCompletion(phase) {
  console.log(`\n🔍 VERIFYING ${phase} IMPLEMENTATION...\n`);
  
  const token = await getAuthToken();
  if (!token) return 0;
  
  const authHeaders = { Authorization: `Bearer ${token}` };
  
  const tests = {
    phase1: [
      { name: 'Work Order Creation', 
        test: async () => {
          const res = await axios.post(`${BASE_URL}/api/workorders`, {
            title: 'Test WO', priority: 'urgent', category: 'HVAC'
          }, { headers: authHeaders });
          return res.data.success && res.data.data._id ? '✅ REAL' : '❌ PLACEHOLDER';
        }
      },
      { name: 'ZATCA QR Generation',
        test: async () => {
          const res = await axios.post(`${BASE_URL}/api/finance/invoices-simple`, {
            customer: 'Test', amount: 100
          }, { headers: authHeaders });
          return res.data.success && res.data.qrCode && res.data.qrCode.length > 100 ? '✅ REAL' : '❌ PLACEHOLDER';
        }
      },
      { name: 'RFQ System',
        test: async () => {
          const res = await axios.post(`${BASE_URL}/api/marketplace/rfq`, {
            title: 'Test RFQ'
          }, { headers: authHeaders });
          return res.data.rfq && res.data.rfq._id ? '✅ REAL' : '❌ PLACEHOLDER';
        }
      }
    ],
    phase2: [
      { name: 'Mobile API - Tenant Login',
        test: async () => {
          const res = await axios.post(`${BASE_URL}/api/mobile/tenant/login`, {
            phone: '+966500000000', otp: '123456'
          });
          return res.data.success && res.data.token && res.data.token.length > 50 ? '✅ REAL' : '❌ PLACEHOLDER';
        }
      },
      { name: 'Mobile API - Technician Tasks',
        test: async () => {
          const res = await axios.get(`${BASE_URL}/api/mobile/technician/tasks`);
          return res.data.success && Array.isArray(res.data.tasks) ? '✅ REAL' : '❌ PLACEHOLDER';
        }
      }
    ],
    phase3: [
      { name: 'Analytics Engine',
        test: async () => {
          const res = await axios.get(`${BASE_URL}/api/analytics/predictive`);
          return res.data.predictions ? '✅ REAL' : '❌ PLACEHOLDER';
        }
      }
    ]
  };
  
  let realCount = 0;
  let totalCount = 0;
  
  for (const test of (tests[phase] || [])) {
    try {
      const result = await test.test();
      console.log(`${test.name}: ${result}`);
      if (result.includes('✅')) realCount++;
      totalCount++;
    } catch (error) {
      console.log(`${test.name}: ❌ ERROR/NOT IMPLEMENTED`, error?.message || '');
      totalCount++;
    }
  }
  
  const percentage = Math.round((realCount / totalCount) * 100);
  console.log(`\n📊 ${phase.toUpperCase()} REAL COMPLETION: ${percentage}%\n`);
  
  return percentage;
}

// RUN ALL PHASE CHECKS
(async () => {
  const phase1 = await verifyPhaseCompletion('phase1');
  const phase2 = await verifyPhaseCompletion('phase2');
  
  if (phase1 < 100) {
    console.log('❌ PHASE 1 INCOMPLETE - FIX THIS FIRST!');
    console.log('SEARCH FOR: "workOrderSchema", "generateZATCAQR", "RFQSchema"');
  } else if (phase2 < 100) {
    console.log('✅ Phase 1 Complete');
    console.log('🔧 Working on Phase 2 - Mobile Apps');
  }
})();
