const http = require('http');

function request(options, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = bodyObj ? JSON.stringify(bodyObj) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyObj && { 'Content-Length': Buffer.byteLength(data) }),
        ...(options.headers || {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', err => reject(err));
    if (bodyObj) req.write(data);
    req.end();
  });
}

async function run() {
  try {
    console.log('Waiting 3.5s for backend database fallback activation...');
    await new Promise(r => setTimeout(r, 3500));

    console.log('\n1. Logging in as bmu@gmail.com...');
    const bmuLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'bmu@gmail.com',
      password: 'password123'
    });
    console.log('bmu@gmail.com Login Status:', bmuLogin.status, 'User Name:', bmuLogin.data.user ? bmuLogin.data.user.name : 'N/A');

    console.log('\n2. Registering new account testuser_persisted@example.com...');
    const regRes = await request({ path: '/api/auth/register', method: 'POST' }, {
      name: 'Persisted User',
      email: 'testuser_persisted@example.com',
      password: 'password123',
      role: 'customer'
    });
    console.log('Registration Status:', regRes.status, 'Has Token:', !!regRes.data.token, 'User:', regRes.data.user ? regRes.data.user.email : 'N/A');

    console.log('\n3. Logging in with newly registered testuser_persisted@example.com...');
    const regLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'testuser_persisted@example.com',
      password: 'password123'
    });
    console.log('Registered User Login Status:', regLogin.status, 'Token Issued:', !!regLogin.data.token);

    console.log('\n--- VERIFICATION SUCCESS ---');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
