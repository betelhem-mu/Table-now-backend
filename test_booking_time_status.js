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
      name: 'Executive Coaching Session',
      description: '1-on-1 strategic leadership coaching.',
      price: 150,
      duration: 45,
      category: 'Education & Coaching'
    });
    const serviceId = servRes.data.service._id;

    console.log('\n--- 2. CUSTOMER LOGIN & CREATE BOOKING WITH DATE AND TIME ---');
    const custLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'customer@example.com',
      password: 'password123'
    });
    const custToken = custLogin.data.token;

    const bookingDate = new Date(Date.now() + 86400000 * 3);
    bookingDate.setHours(10, 30, 0, 0);

    const createBookingRes = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString(),
      time: '10:30 AM'
    });

    console.log('Create Booking Status:', createBookingRes.status);
    const booking = createBookingRes.data.booking;
    console.log('Booking Fields Check:');
    console.log('  Customer:', !!booking.customer);
    console.log('  Service:', !!booking.service);
    console.log('  Date:', booking.date);
    console.log('  Time:', booking.time);
    console.log('  Status:', booking.status);

    if (booking.time === '10:30 AM' && booking.status === 'scheduled') {
      console.log('\n--- SUCCESS: BOOKING CORRECTLY STORES CUSTOMER, SERVICE, DATE, TIME, AND STATUS ("scheduled") ---');
    } else {
      console.error('\n--- FAILURE: TIME OR STATUS MISMATCH ---');
    }
  } catch (err) {
    console.error('Test script failed:', err);
  }
}

run();
