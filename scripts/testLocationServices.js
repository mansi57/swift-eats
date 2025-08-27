const axios = require('axios');

// Configuration
const GPS_SERVICE_URL = 'http://localhost:3002';
const LOCATION_SERVICE_URL = 'http://localhost:3003';

// Sample driver location data
const sampleLocationData = {
    driverId: 'driver_001',
    latitude: 40.7128,
    longitude: -74.0060,
    timestamp: new Date().toISOString(),
    accuracy: 5.0,
    speed: 25.0,
    heading: 180,
    altitude: 10,
    batteryLevel: 85,
    networkType: '4G'
};

// Sample batch location data
const sampleBatchData = {
    locations: [
        {
            driverId: 'driver_001',
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: new Date().toISOString(),
            accuracy: 5.0,
            speed: 25.0
        },
        {
            driverId: 'driver_002',
            latitude: 40.7589,
            longitude: -73.9851,
            timestamp: new Date().toISOString(),
            accuracy: 3.0,
            speed: 0.0
        },
        {
            driverId: 'driver_003',
            latitude: 40.7505,
            longitude: -73.9934,
            timestamp: new Date().toISOString(),
            accuracy: 7.0,
            speed: 15.0
        }
    ]
};

async function testGPSService() {
    console.log('🧭 Testing GPS Service...\n');

    try {
        // Test health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${GPS_SERVICE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Test single location update
        console.log('\n2. Testing single location update...');
        const singleResponse = await axios.post(`${GPS_SERVICE_URL}/gps/location`, sampleLocationData);
        console.log('✅ Single location update:', singleResponse.data);

        // Test batch location update
        console.log('\n3. Testing batch location update...');
        const batchResponse = await axios.post(`${GPS_SERVICE_URL}/gps/location/batch`, sampleBatchData);
        console.log('✅ Batch location update:', batchResponse.data);

        // Test service stats
        console.log('\n4. Testing service stats...');
        const statsResponse = await axios.get(`${GPS_SERVICE_URL}/stats`);
        console.log('✅ Service stats:', statsResponse.data);

    } catch (error) {
        console.error('❌ GPS Service test failed:', error.response?.data || error.message);
    }
}

async function testLocationService() {
    console.log('\n📍 Testing Location Service...\n');

    try {
        // Test health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${LOCATION_SERVICE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Wait a moment for GPS events to be processed
        console.log('\n2. Waiting for GPS events to be processed...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test getting driver location
        console.log('\n3. Testing driver location retrieval...');
        const locationResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/driver/driver_001`);
        console.log('✅ Driver location:', locationResponse.data);

        // Test getting nearby drivers
        console.log('\n4. Testing nearby drivers...');
        const nearbyResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/nearby?latitude=40.7128&longitude=-74.0060&radius=5`);
        console.log('✅ Nearby drivers:', nearbyResponse.data);

        // Test driver status
        console.log('\n5. Testing driver status...');
        const statusResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/driver/driver_001/status`);
        console.log('✅ Driver status:', statusResponse.data);

        // Test analytics
        console.log('\n6. Testing analytics...');
        const analyticsResponse = await axios.get(`${LOCATION_SERVICE_URL}/location/analytics/driver-activity`);
        console.log('✅ Driver activity analytics:', analyticsResponse.data);

        // Test service stats
        console.log('\n7. Testing service stats...');
        const statsResponse = await axios.get(`${LOCATION_SERVICE_URL}/stats`);
        console.log('✅ Service stats:', statsResponse.data);

    } catch (error) {
        console.error('❌ Location Service test failed:', error.response?.data || error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting GPS and Location Services Test\n');
    console.log('Make sure both services are running:');
    console.log('- GPS Service: npm run gps:dev');
    console.log('- Location Service: npm run location:dev\n');

    await testGPSService();
    await testLocationService();

    console.log('\n✨ Test completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testGPSService, testLocationService };
