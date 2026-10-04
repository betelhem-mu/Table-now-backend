const http = require('http');

function request(options, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = bodyObj ? JSON.stringify(bodyObj) : '';
    const req = http.request({
      hostname: '127.0.0.1',
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
      res.on('end', () => resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} }));
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
    const loginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'provider@example.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Login Status:', loginRes.status, 'Token:', token ? 'SUCCESS' : 'FAILED');

    console.log('\n2. Fetching Services (Initial state - should be EMPTY)...');
    const get1 = await request({ path: '/api/services', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    console.log('Initial Services Count:', get1.data.services ? get1.data.services.length : 0);

    console.log('\n3. Creating New Service: Executive Haircut & Styling ($50, 45 min)...');
    const createRes = await request({ path: '/api/services', method: 'POST', headers: { Authorization: `Bearer ${token}` } }, {
      name: 'Executive Haircut & Styling',
      description: 'Premium haircut with hot towel beard trim and styling.',
      price: 50,
      duration: 45,
      category: 'Beauty & Wellness',
      image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80'
    });
    console.log('Create Service Status:', createRes.status, 'ID:', createRes.data.service ? createRes.data.service._id : 'N/A');
    const createdId = createRes.data.service ? createRes.data.service._id : null;

    console.log('\n4. Fetching Services after creation...');
    const get2 = await request({ path: '/api/services', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    console.log('Services Count after creation:', get2.data.services ? get2.data.services.length : 0);
    console.log('Created Service Name:', get2.data.services && get2.data.services[0] ? get2.data.services[0].name : 'N/A');

    if (createdId) {
      console.log('\n5. Updating Service price to $60...');
      const updateRes = await request({ path: `/api/services/${createdId}`, method: 'PUT', headers: { Authorization: `Bearer ${token}` } }, {
        price: 60
      });
      console.log('Update Status:', updateRes.status, 'New Price:', updateRes.data.service ? updateRes.data.service.price : 'N/A');

      console.log('\n6. Deleting Service...');
      const deleteRes = await request({ path: `/api/services/${createdId}`, method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      console.log('Delete Status:', deleteRes.status, deleteRes.data.message);

      console.log('\n7. Fetching Services after deletion (should be EMPTY)...');
      const get3 = await request({ path: '/api/services', method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      console.log('Final Services Count:', get3.data.services ? get3.data.services.length : 0);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
