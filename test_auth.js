const http = require('http');

function postJSON(path, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(bodyObj);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', err => reject(err));
    req.write(data);
    req.end();
  });
}

async function run() {
  try {
    console.log('--- TEST 1: Login with provider@example.com ---');
    const res1 = await postJSON('/api/auth/login', { email: 'provider@example.com', password: 'password123' });
    console.log('Status:', res1.status, res1.data);

    console.log('\n--- TEST 2: Registration ---');
    const testEmail = 'user_' + Date.now() + '@example.com';
    const res2 = await postJSON('/api/auth/register', { name: 'Test User', email: testEmail, password: 'password123', role: 'customer' });
    console.log('Status:', res2.status, res2.data);

    console.log('\n--- TEST 3: Login with Registered User ---');
    const res3 = await postJSON('/api/auth/login', { email: testEmail, password: 'password123' });
    console.log('Status:', res3.status, res3.data);

    console.log('\n--- TEST 4: Login with bm9577971@gmail.com ---');
    const res4 = await postJSON('/api/auth/login', { email: 'bm9577971@gmail.com', password: 'password123' });
    console.log('Status:', res4.status, res4.data);
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

run();
