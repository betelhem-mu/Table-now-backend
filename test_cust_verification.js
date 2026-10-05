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

    console.log('1. Logging in as Provider provider@example.com...');
    const provLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'provider@example.com',
      password: 'password123'
    });
    console.log('Provider Login Status:', provLogin.status);
    const provToken = provLogin.data.token;

    console.log('\n2. Provider creating service...');
    const createRes = await request({ path: '/api/services', method: 'POST', headers: { Authorization: `Bearer ${provToken}` } }, {
      name: 'Spa & Facial Therapy',
      description: 'Rejuvenating skin massage and facial therapy.',
      price: 85,
      duration: 50,
      category: 'Beauty & Wellness'
    });
    console.log('Create Service Status:', createRes.status, 'Name:', createRes.data.service ? createRes.data.service.name : 'N/A');

    console.log('\n3. Logging in as Customer customer@example.com...');
    const custLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'customer@example.com',
      password: 'password123'
    });
    console.log('Customer Login Status:', custLogin.status);
    const custToken = custLogin.data.token;

    console.log('\n4. Fetching services with Customer token...');
    const custServicesRes = await request({ path: '/api/services', method: 'GET', headers: { Authorization: `Bearer ${custToken}` } });
    console.log('Customer GET Services Status:', custServicesRes.status, 'Count:', custServicesRes.data.services ? custServicesRes.data.services.length : 0);

    console.log('\n5. Fetching services without token (public view)...');
    const publicServicesRes = await request({ path: '/api/services', method: 'GET' });
    console.log('Public GET Services Status:', publicServicesRes.status, 'Count:', publicServicesRes.data.services ? publicServicesRes.data.services.length : 0);

    console.log('\n6. Registering new customer (user_test_unique@example.com)...');
    const reg1 = await request({ path: '/api/auth/register', method: 'POST' }, {
      name: 'Unique Customer',
      email: 'user_test_unique@example.com',
      password: 'password123',
      role: 'customer'
    });
    console.log('Register 1 Status:', reg1.status, 'Message:', reg1.data.message);

    console.log('\n7. Registering DUPLICATE customer with same email (user_test_unique@example.com)...');
    const reg2 = await request({ path: '/api/auth/register', method: 'POST' }, {
      name: 'Duplicate Customer',
      email: 'user_test_unique@example.com',
      password: 'password123',
      role: 'customer'
    });
    console.log('Register 2 Status (Duplicate):', reg2.status, 'Message:', reg2.data.message);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
