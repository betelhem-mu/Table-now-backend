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
    console.log('--- TEST: DUPLICATE BOOKING REJECTION FOR TAKEN SERVICE/TIME SLOTS ---');

    console.log('\n1. Provider Login & Create Service...');
    const provLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'provider@example.com',
      password: 'password123'
    });
    if (provLogin.status !== 200) {
      throw new Error(`Provider login failed with status ${provLogin.status}`);
    }
    const provToken = provLogin.data.token;

    const servRes = await request({ path: '/api/services', method: 'POST', headers: { Authorization: `Bearer ${provToken}` } }, {
      name: 'Conflict Test Therapy',
      description: 'Test service for conflict validation.',
      price: 80,
      duration: 30,
      category: 'Health & Fitness'
    });
    const serviceId = servRes.data.service._id;
    console.log('  Service created with ID:', serviceId);

    console.log('\n2. Customer Login...');
    const custLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'customer@example.com',
      password: 'password123'
    });
    const custToken = custLogin.data.token;

    const bookingDate = new Date(Date.now() + 86400000 * 5); // 5 days in future
    bookingDate.setHours(11, 0, 0, 0);
    const timeSlot = '11:00 AM';

    console.log('\n3. First Customer Books Service for slot:', timeSlot);
    const booking1 = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString(),
      time: timeSlot
    });
    console.log('  First Booking Status:', booking1.status, booking1.data.message || '');
    if (booking1.status !== 201) {
      throw new Error(`First booking expected status 201, got ${booking1.status}`);
    }

    console.log('\n4. Attempt Second Booking for SAME Service & SAME Time Slot...');
    const booking2 = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString(),
      time: timeSlot
    });
    console.log('  Second Booking Status:', booking2.status, 'Message:', booking2.data.message || '');
    if (booking2.status === 400 && booking2.data.message.includes('already booked')) {
      console.log('  SUCCESS: API correctly rejected second booking for taken time slot!');
    } else {
      console.error('  FAILURE: Expected HTTP 400 with "already booked" message. Got:', booking2.status, booking2.data);
      process.exit(1);
    }

    console.log('\n5. Attempt Booking for SAME Service at DIFFERENT Time Slot (e.g. 02:00 PM)...');
    const booking3 = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString(),
      time: '02:00 PM'
    });
    console.log('  Different Time Slot Booking Status:', booking3.status, booking3.data.message || '');
    if (booking3.status === 201) {
      console.log('  SUCCESS: Different time slot booking allowed as expected!');
    } else {
      console.error('  FAILURE: Different time slot booking should be allowed. Got:', booking3.status);
      process.exit(1);
    }

    console.log('\n6. Cancel First Booking and Re-attempt Booking for original slot...');
    const booking1Id = booking1.data.booking._id;
    const cancelRes = await request({ path: `/api/bookings/${booking1Id}/cancel`, method: 'PUT', headers: { Authorization: `Bearer ${custToken}` } });
    console.log('  Cancel Booking Status:', cancelRes.status);

    const rebooking = await request({ path: '/api/bookings', method: 'POST', headers: { Authorization: `Bearer ${custToken}` } }, {
      serviceId,
      date: bookingDate.toISOString(),
      time: timeSlot
    });
    console.log('  Rebooking Status after cancellation:', rebooking.status, rebooking.data.message || '');
    if (rebooking.status === 201) {
      console.log('  SUCCESS: Rebooking allowed after cancellation!');
    } else {
      console.error('  FAILURE: Rebooking failed after cancellation. Got:', rebooking.status);
      process.exit(1);
    }

    console.log('\n--- ALL TIME SLOT CONFLICT TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

run();
