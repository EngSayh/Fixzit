#!/usr/bin/env node
/**
 * Test script for superadmin login flow
 * Run with: node scripts/test-superadmin-login.mjs
 */
import { config } from 'dotenv';
import http from 'http';
import https from 'https';

config({ path: '.env.local' });

const user = process.env.SUPERADMIN_USERNAME;
const pass = process.env.SUPERADMIN_PASSWORD;
const host = process.argv[2] || 'localhost';
const port = process.argv[3] || 3000;
const protocol = host === 'localhost' ? http : https;

console.log('=== Superadmin Login Test ===');
console.log('Host:', host);
console.log('User:', user);
console.log('Pass length:', pass?.length);
console.log('Connecting to:', `http://${host}:${port}/api/superadmin/login`);

async function testLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: user, password: pass });

    const options = {
      hostname: host,
      port: host === 'localhost' ? port : 443,
      path: '/api/superadmin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n--- Login Response ---');
        console.log('Status:', res.statusCode);
        console.log('Cookies set:', cookies.length);
        cookies.forEach(c => {
          const name = c.split('=')[0];
          const value = c.split('=')[1]?.split(';')[0];
          console.log(`  ${name}: ${value?.substring(0, 30)}...`);
        });
        console.log('Body:', data);
        
        if (res.statusCode === 200 && cookies.length > 0) {
          resolve({ cookie: cookies.find(c => c.includes('superadmin_session')) });
        } else {
          reject(new Error(`Login failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testProtectedRoute(cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: host === 'localhost' ? port : 443,
      path: '/superadmin/issues',
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    };

    const req = protocol.request(options, (res) => {
      console.log('\n--- Protected Route Test ---');
      console.log('Path: /superadmin/issues');
      console.log('Status:', res.statusCode);
      console.log('Location:', res.headers['location'] || 'none');
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: Access granted to protected route');
        resolve(true);
      } else if (res.statusCode === 307 || res.statusCode === 302) {
        const location = res.headers['location'] || '';
        if (location.includes('/superadmin/login')) {
          console.log('❌ FAIL: Redirected to login');
          console.log('Redirect URL:', location);
          // Parse query params from redirect URL
          const url = new URL(location, `http://${host}`);
          console.log('Debug params:');
          for (const [key, value] of url.searchParams) {
            console.log(`  ${key}: ${value}`);
          }
        }
        resolve(false);
      } else {
        resolve(false);
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    const { cookie } = await testLogin();
    console.log('\n✅ Login successful, testing protected route...');
    
    // Extract just the cookie value for the next request
    const cookieValue = cookie?.split(';')[0];
    await testProtectedRoute(cookieValue);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
