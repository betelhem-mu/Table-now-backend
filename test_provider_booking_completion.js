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
    console.log('Waiting 3.5s for backend server initialization...');
    await new Promise(r => setTimeout(r, 3500));

    console.log('\n--- 1. PROVIDER LOGIN & CREATE SERVICE ---');
    const provLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'provider@example.com',
      password: 'password123'
    });
    const provToken = provLogin.data.token;

    const servRes = await request({ path: '/api/services', method: 'POST', headers: { Authorization: `Bearer ${provToken}` } }, {
      name: 'Personal Fitness Assessment',
      description: 'Comprehensive fitness and posture evaluation.',
      price: 80,
      duration: 45,
      category: 'Health & Fitness'
    });
    const serviceId = servRes.data.service._id;

    console.log('\n--- 2. CUSTOMER BOOK APPOINTMENT ---');
    const custLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'customer@example.com',
      password: 'password123'
    });
    const custToken = custLogin.data.token;

    const bookingDate = new Date(Date.now() + 86400000 * 4);
    bookingDate.setHours(15, 0, 0, 0);

    const bookingRes = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString(),
      time: '03:00 PM'
    });
    const bookingId = bookingRes.data.booking._id;
    console.log('Booking Created ID:', bookingId, 'Status:', bookingRes.data.booking.status);

    console.log('\n--- 3. PROVIDER: FETCH BOOKINGS ---');
    const provBookingsRes = await request({ path: '/api/bookings/provider', method: 'GET', headers: { Authorization: `Bearer ${provToken}` } });
    console.log('Get Provider Bookings Status:', provBookingsRes.status, 'Total Found:', provBookingsRes.data.bookings ? provBookingsRes.data.bookings.length : 0);

    console.log('\n--- 4. PROVIDER: MARK APPOINTMENT AS COMPLETED ---');
    const completeRes = await request({ path: `/api/bookings/${bookingId}/complete`, method: 'PUT', headers: { Authorization: `Bearer ${provToken}` } });
    console.log('Complete Booking Status:', completeRes.status, 'Message:', completeRes.data.message);
    console.log('Updated Status:', completeRes.data.booking ? completeRes.data.booking.status : 'N/A');

    if (completeRes.status === 200 && completeRes.data.booking && completeRes.data.booking.status === 'completed') {
      console.log('\n--- SUCCESS: PROVIDER CAN VIEW BOOKINGS AND MARK APPOINTMENTS AS COMPLETED ---');
    } else {
      console.error('\n--- FAILURE: APPOINTMENT COULD NOT BE COMPLETED ---');
    }
  } catch (err) {
    console.error('Test script failed:', err);
  }
}

run();
