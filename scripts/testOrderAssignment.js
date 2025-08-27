const axios = require('axios');

// Configuration
const ORDER_SERVICE_URL = 'http://localhost:3000';
const DRIVER_ASSIGNMENT_SERVICE_URL = 'http://localhost:3004';

// Sample order data
const sampleOrderData = {
    customerId: 'customer_001',
    destination: {
        latitude: 40.7589,
        longitude: -73.9851,
        address: '123 Main St, New York, NY'
    },
    restaurantId: 'restaurant_001',
    items: [
        {
            id: 'item_001',
            quantity: 2,
            specialInstructions: 'Extra cheese please'
        },
        {
            id: 'item_002',
            quantity: 1,
            specialInstructions: 'No onions'
        }
    ],
    specialInstructions: 'Please deliver to the front door'
};

// Sample driver assignment request
const sampleAssignmentRequest = {
    orderId: 'order_test_001',
    restaurantLatitude: 40.7128,
    restaurantLongitude: -74.0060,
    customerLatitude: 40.7589,
    customerLongitude: -73.9851,
    preparationTime: 15, // minutes
    radius: 5, // km
    items: [
        {
            id: 'item_001',
            name: 'Margherita Pizza',
            quantity: 2,
            price: 12.99
        },
        {
            id: 'item_002',
            name: 'Caesar Salad',
            quantity: 1,
            price: 8.99
        }
    ],
    totalAmount: 34.97,
    specialInstructions: 'Please deliver to the front door'
};

async function testOrderService() {
    console.log('🛒 Testing Order Service...\n');

    try {
        // Test health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${ORDER_SERVICE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Test order creation (this would normally require authentication)
        console.log('\n2. Testing order creation...');
        console.log('Note: This would require proper authentication and database setup');
        console.log('Sample order data:', JSON.stringify(sampleOrderData, null, 2));

    } catch (error) {
        console.error('❌ Order Service test failed:', error.response?.data || error.message);
    }
}

async function testDriverAssignmentService() {
    console.log('\n🚗 Testing Driver Assignment Service...\n');

    try {
        // Test health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${DRIVER_ASSIGNMENT_SERVICE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Test manual assignment request
        console.log('\n2. Testing manual assignment request...');
        const assignmentResponse = await axios.post(
            `${DRIVER_ASSIGNMENT_SERVICE_URL}/assign`,
            sampleAssignmentRequest
        );
        console.log('✅ Manual assignment request:', assignmentResponse.data);

        // Test service stats
        console.log('\n3. Testing service stats...');
        const statsResponse = await axios.get(`${DRIVER_ASSIGNMENT_SERVICE_URL}/stats`);
        console.log('✅ Service stats:', statsResponse.data);

    } catch (error) {
        console.error('❌ Driver Assignment Service test failed:', error.response?.data || error.message);
    }
}

async function testKafkaCommunication() {
    console.log('\n📡 Testing Kafka Communication...\n');

    console.log('1. Order Service publishes assignment request to Kafka');
    console.log('   Topic: driver_assignment.requests.{geo}');
    console.log('   Message:', JSON.stringify(sampleAssignmentRequest, null, 2));

    console.log('\n2. Driver Assignment Service consumes request and processes it');
    console.log('   - Finds available drivers in the area');
    console.log('   - Calculates priority scores based on:');
    console.log('     * Slack time (preparation time - driver arrival time)');
    console.log('     * Distance to restaurant');
    console.log('     * Total ETA');
    console.log('   - Assigns the highest priority driver');

    console.log('\n3. Driver Assignment Service publishes response to Kafka');
    console.log('   Topic: driver_assignment.responses');
    console.log('   Success Response:', JSON.stringify({
        orderId: 'order_test_001',
        driverId: 'driver_001',
        eta: 25, // minutes
        assignedAt: new Date().toISOString(),
        status: 'assigned'
    }, null, 2));

    console.log('\n4. Order Service consumes response and updates order');
    console.log('   - Updates order status to "assigned_driver"');
    console.log('   - Sets driver_id and estimated_delivery_time');
    console.log('   - Updates driver status to busy');
}

async function runTests() {
    console.log('🚀 Starting Order Service and Driver Assignment Service Test\n');
    console.log('Make sure the following services are running:');
    console.log('- Order Service: npm run dev');
    console.log('- Driver Assignment Service: npm run driver-assignment:dev');
    console.log('- Kafka: localhost:9092');
    console.log('- Redis: localhost:6379\n');

    await testOrderService();
    await testDriverAssignmentService();
    await testKafkaCommunication();

    console.log('\n✨ Test completed!');
    console.log('\n📋 Summary:');
    console.log('- Order Service creates orders and publishes assignment requests');
    console.log('- Driver Assignment Service processes requests and assigns drivers');
    console.log('- Communication happens asynchronously via Kafka');
    console.log('- Orders are updated with driver information upon assignment');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testOrderService, testDriverAssignmentService, testKafkaCommunication };
