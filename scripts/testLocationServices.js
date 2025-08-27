const axios = require('axios');

const LOCATION_SERVICE_URL = 'http://localhost:3002';
const GPS_SERVICE_URL = 'http://localhost:3001';

async function testLocationServices() {
    console.log('🧪 Testing Location Services...\n');

    try {
        // 1. Test Location Service Health
        console.log('1. Testing Location Service Health...');
        const healthResponse = await axios.get(`${LOCATION_SERVICE_URL}/health`);
        console.log('✅ Location Service Health:', healthResponse.data);
        console.log('');

        // 2. Test GPS Service Health
        console.log('2. Testing GPS Service Health...');
        const gpsHealthResponse = await axios.get(`${GPS_SERVICE_URL}/health`);
        console.log('✅ GPS Service Health:', gpsHealthResponse.data);
        console.log('');

        // 3. Send GPS location update (simulating driver app)
        console.log('3. Sending GPS location update...');
        const locationUpdate = {
            driverId: 'driver_123',
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: new Date().toISOString(),
            accuracy: 5,
            speed: 25,
            heading: 180,
            batteryLevel: 85
        };

        const gpsResponse = await axios.post(`${GPS_SERVICE_URL}/gps/location`, locationUpdate);
        console.log('✅ GPS Update Response:', gpsResponse.data);
        console.log('');

        // 4. Wait a moment for Location Service to process the update
        console.log('4. Waiting for Location Service to process update...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('');

        // 5. Customer App: Poll for driver location (REST API)
        console.log('5. Customer App: Polling for driver location...');
        const driverLocationResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/driver/driver_123`);
        console.log('✅ Driver Location:', driverLocationResponse.data);
        console.log('');

        // 6. Customer App: Poll for nearby drivers
        console.log('6. Customer App: Polling for nearby drivers...');
        const nearbyDriversResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/nearby?latitude=40.7128&longitude=-74.0060&radius=5`);
        console.log('✅ Nearby Drivers:', nearbyDriversResponse.data);
        console.log('');

        // 7. Customer App: Poll for order ETA
        console.log('7. Customer App: Polling for order ETA...');
        const orderETAResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/order/order_456/eta`);
        console.log('✅ Order ETA:', orderETAResponse.data);
        console.log('');

        // 8. Customer App: Poll for driver status
        console.log('8. Customer App: Polling for driver status...');
        const driverStatusResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/driver/driver_123/status`);
        console.log('✅ Driver Status:', driverStatusResponse.data);
        console.log('');

        // 9. Simulate customer app polling pattern
        console.log('9. Simulating Customer App Polling Pattern...');
        console.log('📱 Customer App would poll every 5-10 seconds like this:');
        console.log('   - GET /location/driver/{driverId}');
        console.log('   - GET /location/order/{orderId}/eta');
        console.log('   - GET /location/driver/{driverId}/status');
        console.log('');

        // 10. Show service statistics
        console.log('10. Location Service Statistics...');
        const statsResponse = await axios.get(`${LOCATION_SERVICE_URL}/stats`);
        console.log('✅ Service Stats:', statsResponse.data);
        console.log('');

        console.log('🎉 All tests completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   - GPS Service: Receives location updates from driver apps');
        console.log('   - Location Service: Processes GPS events and updates Redis cache');
        console.log('   - Customer App: Polls Location Service REST APIs for real-time data');
        console.log('   - No WebSockets needed - simple REST polling is sufficient');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the tests
testLocationServices();
