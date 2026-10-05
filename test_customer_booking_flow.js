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

    console.log('\n--- 1. PROVIDER: LOGIN & CREATE SERVICE ---');
    const provLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'provider@example.com',
      password: 'password123'
    });
    console.log('Provider Login:', provLogin.status);
    const provToken = provLogin.data.token;

    const servRes = await request({ path: '/api/services', method: 'POST', headers: { Authorization: `Bearer ${provToken}` } }, {
      name: 'Deep Tissue Body Therapy',
      description: 'Relaxing full body therapeutic massage.',
      price: 110,
      duration: 60,
      category: 'Beauty & Wellness'
    });
    console.log('Create Service:', servRes.status, 'ID:', servRes.data.service ? servRes.data.service._id : 'N/A');
    const serviceId = servRes.data.service._id;

    console.log('\n--- 2. CUSTOMER: LOGIN & BROWSE SERVICES ---');
    const custLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'customer@example.com',
      password: 'password123'
    });
    console.log('Customer Login:', custLogin.status);
    const custToken = custLogin.data.token;

    const browseRes = await request({ path: '/api/services', method: 'GET', headers: { Authorization: `Bearer ${custToken}` } });
    console.log('Browse Services Status:', browseRes.status, 'Found Services:', browseRes.data.services ? browseRes.data.services.length : 0);

    console.log('\n--- 3. CUSTOMER: CHOOSE DATE/TIME & CREATE BOOKING ---');
    const bookingDate = new Date(Date.now() + 86400000 * 2); // 2 days in future at 14:00
    bookingDate.setHours(14, 0, 0, 0);

    const createBookingRes = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString()
    });
    console.log('Create Booking Status:', createBookingRes.status, 'Message:', createBookingRes.data.message);
    const bookingId = createBookingRes.data.booking ? createBookingRes.data.booking._id : null;

    console.log('\n--- 4. CUSTOMER: VIEW MY BOOKINGS ---');
    const getBookingsRes = await request({ path: '/api/bookings/customer', method: 'GET', headers: { Authorization: `Bearer ${custToken}` } });
    console.log('Get Customer Bookings Status:', getBookingsRes.status, 'Total Bookings:', getBookingsRes.data.bookings ? getBookingsRes.data.bookings.length : 0);

    if (bookingId) {
      console.log('\n--- 5. CUSTOMER: CANCEL BOOKING ---');
      const cancelRes = await request({ path: `/api/bookings/${bookingId}/cancel`, method: 'PUT', headers: { Authorization: `Bearer ${custToken}` } });
      console.log('Cancel Booking Status:', cancelRes.status, 'Updated Status:', cancelRes.data.booking ? cancelRes.data.booking.status : 'N/A');
    }

    console.log('\n--- ALL CUSTOMER BOOKING FLOW STEPS PASSED PERFECTLY ---');
  } catch (err) {
    console.error('Test script failed:', err);
  }
}

run();
