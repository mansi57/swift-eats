const EventSource = require('eventsource');
const axios = require('axios');

class CustomerApp {
    constructor(customerId, locationServiceUrl) {
        this.customerId = customerId;
        this.locationServiceUrl = locationServiceUrl;
        this.eventSource = null;
        this.subscriptions = new Set();
        this.driverLocations = new Map();
        this.orderETAs = new Map();
    }

    /**
     * Connect to SSE stream for real-time updates
     */
    async connect() {
        console.log(`🔗 Connecting to SSE stream for customer: ${this.customerId}`);
        
        this.eventSource = new EventSource(`${this.locationServiceUrl}/sse/location/${this.customerId}`);
        
        this.eventSource.onopen = () => {
            console.log(`✅ SSE connection established for ${this.customerId}`);
        };

        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleSSEMessage(data);
        };

        this.eventSource.onerror = (error) => {
            console.error(`❌ SSE connection error for ${this.customerId}:`, error);
            // Reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
        };
    }

    /**
     * Handle incoming SSE messages
     */
    handleSSEMessage(data) {
        switch (data.type) {
            case 'connected':
                console.log(`🎉 Connected to location service: ${data.timestamp}`);
                break;

            case 'heartbeat':
                // Keep connection alive
                break;

            case 'driver_location_update':
                this.updateDriverLocation(data.driverId, data.location);
                break;

            case 'order_eta_update':
                this.updateOrderETA(data.orderId, data.eta);
                break;

            default:
                console.log(`📨 Received message: ${data.type}`);
        }
    }

    /**
     * Subscribe to driver location updates
     */
    async subscribeToDriver(driverId) {
        try {
            await axios.post(`${this.locationServiceUrl}/sse/subscribe/driver/${this.customerId}/${driverId}`);
            this.subscriptions.add(`driver_location:${driverId}`);
            console.log(`👁️  Subscribed to driver ${driverId} location updates`);
        } catch (error) {
            console.error(`❌ Failed to subscribe to driver ${driverId}:`, error.message);
        }
    }

    /**
     * Subscribe to order ETA updates
     */
    async subscribeToOrder(orderId) {
        try {
            await axios.post(`${this.locationServiceUrl}/sse/subscribe/order/${this.customerId}/${orderId}`);
            this.subscriptions.add(`order_eta:${orderId}`);
            console.log(`👁️  Subscribed to order ${orderId} ETA updates`);
        } catch (error) {
            console.error(`❌ Failed to subscribe to order ${orderId}:`, error.message);
        }
    }

    /**
     * Update driver location in local cache
     */
    updateDriverLocation(driverId, location) {
        this.driverLocations.set(driverId, {
            ...location,
            lastUpdate: new Date()
        });

        console.log(`📍 Driver ${driverId} location updated:`);
        console.log(`   - Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}`);
        console.log(`   - Speed: ${location.speed} km/h, Heading: ${location.heading}°`);
        console.log(`   - Battery: ${location.batteryLevel}%`);
        console.log(`   - Accuracy: ${location.accuracy}m`);
        console.log('');
    }

    /**
     * Update order ETA in local cache
     */
    updateOrderETA(orderId, eta) {
        this.orderETAs.set(orderId, {
            ...eta,
            lastUpdate: new Date()
        });

        console.log(`⏰ Order ${orderId} ETA updated:`);
        console.log(`   - ETA: ${eta.eta} minutes`);
        console.log(`   - Driver location: ${eta.driverLocation.latitude.toFixed(6)}, ${eta.driverLocation.longitude.toFixed(6)}`);
        console.log(`   - Calculated at: ${eta.calculatedAt}`);
        console.log('');
    }

    /**
     * Get current driver location
     */
    getDriverLocation(driverId) {
        return this.driverLocations.get(driverId);
    }

    /**
     * Get current order ETA
     */
    getOrderETA(orderId) {
        return this.orderETAs.get(orderId);
    }

    /**
     * Unsubscribe from updates
     */
    async unsubscribe(subscriptionType, id) {
        try {
            await axios.post(`${this.locationServiceUrl}/sse/unsubscribe/${this.customerId}`, {
                subscriptionType,
                id
            });
            this.subscriptions.delete(`${subscriptionType}:${id}`);
            console.log(`👋 Unsubscribed from ${subscriptionType}:${id}`);
        } catch (error) {
            console.error(`❌ Failed to unsubscribe from ${subscriptionType}:${id}:`, error.message);
        }
    }

    /**
     * Disconnect from SSE stream
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            console.log(`🔌 Disconnected from SSE stream for ${this.customerId}`);
        }
    }

    /**
     * Display current status
     */
    showStatus() {
        console.log(`\n📊 Customer App Status for ${this.customerId}:`);
        console.log('='.repeat(50));
        console.log(`Active subscriptions: ${this.subscriptions.size}`);
        this.subscriptions.forEach(sub => console.log(`   - ${sub}`));
        
        console.log(`\nDriver locations: ${this.driverLocations.size}`);
        this.driverLocations.forEach((location, driverId) => {
            console.log(`   - ${driverId}: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
        });
        
        console.log(`\nOrder ETAs: ${this.orderETAs.size}`);
        this.orderETAs.forEach((eta, orderId) => {
            console.log(`   - ${orderId}: ${eta.eta} minutes`);
        });
        console.log('');
    }
}

// Example usage
async function runCustomerAppExample() {
    console.log('🚀 Customer App SSE Example\n');

    const customerApp = new CustomerApp('customer_123', 'http://localhost:3002');

    // Connect to SSE stream
    await customerApp.connect();

    // Subscribe to driver and order updates
    await customerApp.subscribeToDriver('driver_456');
    await customerApp.subscribeToOrder('order_789');

    // Show initial status
    customerApp.showStatus();

    // Keep the app running for 60 seconds to receive updates
    console.log('⏳ Waiting for location updates... (60 seconds)');
    
    setTimeout(() => {
        customerApp.showStatus();
        customerApp.disconnect();
        console.log('✅ Example completed');
        process.exit(0);
    }, 60000);
}

// Run the example if this file is executed directly
if (require.main === module) {
    runCustomerAppExample().catch(console.error);
}

module.exports = CustomerApp;

