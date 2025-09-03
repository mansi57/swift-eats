#!/usr/bin/env node

/**
 * Swift Eats Data Simulator
 * 
 * Simulates load testing with up to 50 drivers generating 10 events/sec
 * to demonstrate the functionality of the Swift Eats platform.
 * 
 * Features:
 * - Realistic driver movement patterns
 * - Order creation and lifecycle simulation
 * - GPS location updates at configurable rates
 * - Performance monitoring and metrics
 * - Results logging to file
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { generateToken } = require('./generateToken');

class SwiftEatsSimulator {
    constructor(config = {}) {
        // Configuration
        this.config = {
            maxDrivers: config.maxDrivers || 50,
            eventsPerSecond: config.eventsPerSecond || 10,
            simulationDurationMinutes: config.simulationDurationMinutes || 5,
            baseUrls: {
                gps: config.gpsServiceUrl || 'http://localhost:3003',
                order: config.orderServiceUrl || 'http://localhost:3001',
                restaurant: config.restaurantServiceUrl || 'http://localhost:3002',
                location: config.locationServiceUrl || 'http://localhost:3004'
            },
            ...config
        };

        // Simulation state
        this.drivers = [];
        this.orders = [];
        this.restaurants = [];
        this.customers = [];
        this.authTokens = {}; // Store JWT tokens for customers
        this.isRunning = false;
        this.startTime = null;
        this.stats = {
            totalGPSEvents: 0,
            totalOrders: 0,
            successfulGPSEvents: 0,
            failedGPSEvents: 0,
            successfulOrders: 0,
            failedOrders: 0,
            avgResponseTime: 0,
            responseTimes: [],
            errors: []
        };

        // NYC area bounds for realistic coordinates
        this.bounds = {
            north: 40.9176,  // Bronx
            south: 40.4774,  // Staten Island
            east: -73.7004,  // Queens
            west: -74.2591   // Staten Island
        };

        this.initializeData();
    }

    /**
     * Initialize simulation data
     */
    initializeData() {
        console.log('🚀 Initializing Swift Eats Simulator...');
        
        // Generate drivers
        this.generateDrivers();
        
        // Generate restaurants
        this.generateRestaurants();
        
        // Generate customers
        this.generateCustomers();

        console.log(`✅ Initialized with ${this.drivers.length} drivers, ${this.restaurants.length} restaurants, ${this.customers.length} customers`);
    }

    /**
     * Generate realistic driver data
     */
    generateDrivers() {
        const driverNames = [
            'Alex Rodriguez', 'Maria Garcia', 'James Wilson', 'Sarah Johnson', 'David Chen',
            'Jessica Brown', 'Michael Davis', 'Emily Taylor', 'Carlos Martinez', 'Amanda White',
            'Kevin Lee', 'Lisa Anderson', 'Robert Kim', 'Michelle Park', 'Daniel Patel',
            'Jennifer Lopez', 'Christopher Wang', 'Ashley Thompson', 'Matthew Singh', 'Rachel Green',
            'Jose Hernandez', 'Karen Miller', 'Anthony Jones', 'Nicole Scott', 'Brian Yang',
            'Stephanie Clark', 'Tyler Robinson', 'Samantha Lewis', 'Jordan Walker', 'Megan Hall',
            'Ryan Young', 'Natalie Allen', 'Brandon King', 'Crystal Wright', 'Austin Lopez',
            'Vanessa Hill', 'Eric Adams', 'Diana Baker', 'Sean Gonzalez', 'Tiffany Nelson',
            'Marcus Carter', 'Brittany Mitchell', 'Lucas Perez', 'Alexis Roberts', 'Ian Turner',
            'Jasmine Phillips', 'Noah Campbell', 'Destiny Parker', 'Caleb Evans', 'Sierra Edwards'
        ];

        const vehicleTypes = ['car', 'motorcycle', 'bicycle', 'scooter'];
        const statuses = ['available', 'on_way_to_restaurant', 'at_restaurant', 'on_way_to_customer'];

        for (let i = 0; i < this.config.maxDrivers; i++) {
            const driver = {
                id: `driver_${i + 1}`,
                name: driverNames[i],
                rating: this.randomFloat(3.8, 5.0, 1),
                vehicleType: this.randomChoice(vehicleTypes),
                status: this.randomChoice(statuses),
                busy: Math.random() < 0.3, // 30% chance of being busy
                currentLocation: this.generateRandomCoordinate(),
                targetLocation: null,
                speed: this.randomFloat(10, 60), // km/h
                heading: this.randomFloat(0, 360),
                batteryLevel: this.randomInt(20, 100),
                networkType: this.randomChoice(['4G', '5G', 'WiFi']),
                lastUpdate: new Date(),
                movementPattern: this.generateMovementPattern()
            };

            // Set target location for moving drivers
            if (driver.status !== 'available') {
                driver.targetLocation = this.generateRandomCoordinate();
            }

            this.drivers.push(driver);
        }
    }

    /**
     * Generate restaurant data - use actual database restaurants
     */
    generateRestaurants() {
        // Use actual restaurant data from the database
        const actualRestaurants = [
            { 
                id: 1, 
                name: 'Pizza Palace', 
                cuisine: 'Italian', 
                location: { latitude: 40.71280000, longitude: -74.00600000 },
                menu: [
                    { id: 1, name: 'Margherita Pizza', price: 15.99 },
                    { id: 2, name: 'Pepperoni Pizza', price: 17.99 },
                    { id: 3, name: 'Veggie Pizza', price: 16.99 }
                ]
            },
            { 
                id: 2, 
                name: 'Burger Joint', 
                cuisine: 'American', 
                location: { latitude: 40.75890000, longitude: -73.98510000 },
                menu: [
                    { id: 4, name: 'Classic Burger', price: 12.99 },
                    { id: 5, name: 'Chicken Burger', price: 11.99 },
                    { id: 6, name: 'Veggie Burger', price: 13.99 }
                ]
            },
            { 
                id: 3, 
                name: 'Sushi Express', 
                cuisine: 'Japanese', 
                location: { latitude: 40.75050000, longitude: -73.99340000 },
                menu: [
                    { id: 7, name: 'California Roll', price: 8.99 },
                    { id: 8, name: 'Salmon Nigiri', price: 6.99 },
                    { id: 9, name: 'Veggie Roll', price: 7.99 }
                ]
            }
        ];

        actualRestaurants.forEach(data => {
            this.restaurants.push({
                id: data.id,
                name: data.name,
                cuisine: data.cuisine,
                location: data.location,
                preparationTime: this.randomInt(10, 25),
                rating: this.randomFloat(3.5, 4.8, 1),
                isOpen: true,
                menu: data.menu
            });
        });
    }

    /**
     * Generate menu items for restaurants
     */
    generateMenu(cuisine) {
        const menuItems = {
            italian: [
                { id: 1, name: 'Margherita Pizza', price: 18.99 },
                { id: 2, name: 'Spaghetti Carbonara', price: 16.50 },
                { id: 3, name: 'Caesar Salad', price: 12.99 }
            ],
            american: [
                { id: 4, name: 'Classic Burger', price: 14.99 },
                { id: 5, name: 'Chicken Wings', price: 11.99 },
                { id: 6, name: 'French Fries', price: 5.99 }
            ],
            japanese: [
                { id: 7, name: 'Salmon Roll', price: 8.99 },
                { id: 8, name: 'Chicken Teriyaki', price: 15.99 },
                { id: 9, name: 'Miso Soup', price: 4.99 }
            ],
            mexican: [
                { id: 10, name: 'Beef Tacos', price: 9.99 },
                { id: 11, name: 'Chicken Burrito', price: 12.99 },
                { id: 12, name: 'Guacamole & Chips', price: 7.99 }
            ],
            chinese: [
                { id: 13, name: 'Sweet & Sour Pork', price: 13.99 },
                { id: 14, name: 'Fried Rice', price: 8.99 },
                { id: 15, name: 'Spring Rolls', price: 6.99 }
            ],
            thai: [
                { id: 16, name: 'Pad Thai', price: 14.99 },
                { id: 17, name: 'Green Curry', price: 16.99 },
                { id: 18, name: 'Tom Yum Soup', price: 8.99 }
            ],
            french: [
                { id: 19, name: 'Coq au Vin', price: 24.99 },
                { id: 20, name: 'French Onion Soup', price: 12.99 },
                { id: 21, name: 'Crème Brûlée', price: 9.99 }
            ]
        };

        return menuItems[cuisine] || menuItems.american;
    }

    /**
     * Generate customer data - use only actual database customers
     */
    generateCustomers() {
        // Use only the actual customer IDs that exist in the database
        const actualCustomers = [
            { id: 1, name: 'John Doe', email: 'john.doe@email.com' },
            { id: 2, name: 'Jane Smith', email: 'jane.smith@email.com' },
            { id: 3, name: 'Bob Johnson', email: 'bob.johnson@email.com' }
        ];

        actualCustomers.forEach(customerData => {
            const customer = {
                id: customerData.id,
                name: customerData.name,
                email: customerData.email,
                location: this.generateRandomCoordinate(),
                phone: `+1${this.randomInt(1000000000, 9999999999)}`,
                orderHistory: []
            };
            
            this.customers.push(customer);
            
            // Generate JWT token for this customer using actual database data
            this.authTokens[customerData.id] = generateToken({
                id: customerData.id,
                email: customerData.email,
                role: 'customer'
            });
        });
    }

    /**
     * Generate movement pattern for driver
     */
    generateMovementPattern() {
        const patterns = ['urban', 'highway', 'mixed'];
        const pattern = this.randomChoice(patterns);
        
        return {
            type: pattern,
            speedVariation: pattern === 'highway' ? 0.1 : 0.3,
            directionChange: pattern === 'urban' ? 0.2 : 0.05,
            stopProbability: pattern === 'urban' ? 0.1 : 0.02
        };
    }

    /**
     * Generate random coordinate within NYC bounds
     */
    generateRandomCoordinate() {
        return {
            latitude: this.randomFloat(this.bounds.south, this.bounds.north, 6),
            longitude: this.randomFloat(this.bounds.west, this.bounds.east, 6)
        };
    }

    /**
     * Start the simulation
     */
    async start() {
        console.log('\n🚀 Starting Swift Eats Load Simulation...');
        console.log(`📊 Configuration:`);
        console.log(`   - Drivers: ${this.config.maxDrivers}`);
        console.log(`   - Events per second: ${this.config.eventsPerSecond}`);
        console.log(`   - Duration: ${this.config.simulationDurationMinutes} minutes`);
        console.log(`   - Total events expected: ${this.config.maxDrivers * this.config.eventsPerSecond * this.config.simulationDurationMinutes * 60}`);

        this.isRunning = true;
        this.startTime = new Date();

        // Check service health before starting
        if (!await this.checkServiceHealth()) {
            console.error('❌ Some services are not available. Please start the services first.');
            return;
        }

        // Start simulation workers
        this.startGPSSimulation();
        this.startOrderSimulation();
        this.startPerformanceMonitoring();

        // Run for specified duration
        setTimeout(() => {
            this.stop();
        }, this.config.simulationDurationMinutes * 60 * 1000);

        console.log('✅ Simulation started! Press Ctrl+C to stop early.\n');
    }

    /**
     * Check if all required services are running
     */
    async checkServiceHealth() {
        console.log('🔍 Checking service health...');
        
        const services = [
            { name: 'GPS Service', url: `${this.config.baseUrls.gps}/health` },
            { name: 'Order Service', url: `${this.config.baseUrls.order}/health` }
        ];

        for (const service of services) {
            try {
                await axios.get(service.url, { timeout: 5000 });
                console.log(`   ✅ ${service.name} is running`);
            } catch (error) {
                console.log(`   ❌ ${service.name} is not available (${service.url})`);
                return false;
            }
        }

        return true;
    }

    /**
     * Start GPS location simulation
     */
    startGPSSimulation() {
        const intervalMs = 1000 / this.config.eventsPerSecond;
        
        setInterval(async () => {
            if (!this.isRunning) return;

            // Update driver locations and send GPS events
            const driver = this.randomChoice(this.drivers);
            this.updateDriverLocation(driver);
            await this.sendGPSUpdate(driver);
        }, intervalMs);
    }

    /**
     * Start order simulation
     */
    startOrderSimulation() {
        // Create new orders every 30-60 seconds
        setInterval(async () => {
            if (!this.isRunning) return;

            await this.createRandomOrder();
        }, this.randomInt(30000, 60000));

        // Update existing orders every 10-20 seconds
        setInterval(async () => {
            if (!this.isRunning) return;

            await this.updateRandomOrderStatus();
        }, this.randomInt(10000, 20000));
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            if (!this.isRunning) return;

            this.logProgress();
        }, 10000); // Log every 10 seconds
    }

    /**
     * Update driver location based on movement pattern
     */
    updateDriverLocation(driver) {
        const pattern = driver.movementPattern;
        
        // Simulate movement towards target if exists
        if (driver.targetLocation) {
            const distance = this.calculateDistance(
                driver.currentLocation,
                driver.targetLocation
            );

            if (distance < 0.1) { // Within 100m of target
                driver.targetLocation = null;
                driver.status = 'available';
            } else {
                // Move towards target
                const bearing = this.calculateBearing(
                    driver.currentLocation,
                    driver.targetLocation
                );
                
                driver.heading = bearing + this.randomFloat(-30, 30); // Add some variation
                const speedKmh = driver.speed * (1 + this.randomFloat(-pattern.speedVariation, pattern.speedVariation));
                const speedMs = speedKmh / 3.6;
                const deltaTime = 1; // 1 second
                const distanceM = speedMs * deltaTime;
                
                driver.currentLocation = this.moveTowardsTarget(
                    driver.currentLocation,
                    driver.targetLocation,
                    distanceM / 1000 // Convert to km
                );
            }
        } else {
            // Random movement
            if (Math.random() < pattern.directionChange) {
                driver.heading += this.randomFloat(-45, 45);
                driver.heading = (driver.heading + 360) % 360;
            }

            if (Math.random() < pattern.stopProbability) {
                driver.speed = 0;
            } else {
                driver.speed = this.randomFloat(10, 60);
            }

            // Move in current direction
            if (driver.speed > 0) {
                const speedMs = driver.speed / 3.6;
                const deltaTime = 1;
                const distanceKm = (speedMs * deltaTime) / 1000;
                
                driver.currentLocation = this.moveInDirection(
                    driver.currentLocation,
                    driver.heading,
                    distanceKm
                );
            }
        }

        // Update other properties
        driver.batteryLevel = Math.max(0, driver.batteryLevel - this.randomFloat(0, 0.1));
        driver.lastUpdate = new Date();
    }

    /**
     * Send GPS update to GPS service
     */
    async sendGPSUpdate(driver) {
        const gpsData = {
            driverId: driver.id,
            latitude: driver.currentLocation.latitude,
            longitude: driver.currentLocation.longitude,
            timestamp: new Date().toISOString(),
            accuracy: this.randomFloat(3, 10, 1),
            speed: driver.speed,
            heading: driver.heading,
            altitude: this.randomFloat(0, 50),
            batteryLevel: driver.batteryLevel,
            networkType: driver.networkType
        };

        const startTime = Date.now();

        try {
            await axios.post(`${this.config.baseUrls.gps}/gps/location`, gpsData, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' }
            });

            const responseTime = Date.now() - startTime;
            this.stats.successfulGPSEvents++;
            this.stats.responseTimes.push(responseTime);
        } catch (error) {
            this.stats.failedGPSEvents++;
            this.stats.errors.push({
                type: 'GPS_UPDATE',
                error: error.message,
                timestamp: new Date()
            });
        }

        this.stats.totalGPSEvents++;
    }

    /**
     * Create a random order
     */
    async createRandomOrder() {
        const customer = this.randomChoice(this.customers);
        const restaurant = this.randomChoice(this.restaurants);
        const menuItems = this.randomChoice(restaurant.menu, this.randomInt(1, 3));

        const orderData = {
            destination: customer.location,
            restaurant: restaurant.id,
            items: Array.isArray(menuItems) ? menuItems.map(item => ({
                id: item.id,
                name: item.name,
                quantity: this.randomInt(1, 3),
                price: item.price
            })) : [{
                id: menuItems.id,
                name: menuItems.name,
                quantity: this.randomInt(1, 3),
                price: menuItems.price
            }]
        };

        try {
            // Get JWT token for this customer
            const authToken = this.getAuthToken(customer.id);
            
            const response = await axios.post(`${this.config.baseUrls.order}/api/orders`, orderData, {
                timeout: 10000,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            this.orders.push({
                id: response.data.id || this.generateId(),
                customerId: customer.id,
                restaurantId: restaurant.id,
                status: 'new_order',
                createdAt: new Date(),
                ...orderData
            });

            this.stats.successfulOrders++;
        } catch (error) {
            this.stats.failedOrders++;
            this.stats.errors.push({
                type: 'ORDER_CREATE',
                error: error.response?.data?.error?.message || error.message,
                timestamp: new Date()
            });
        }

        this.stats.totalOrders++;
    }

    /**
     * Update random order status
     */
    async updateRandomOrderStatus() {
        if (this.orders.length === 0) return;

        const order = this.randomChoice(this.orders.filter(o => o.status !== 'delivered'));
        if (!order) return;

        const statusProgression = {
            'new_order': 'order_received',
            'order_received': 'food_preparing',
            'food_preparing': 'ready_pickup',
            'ready_pickup': 'assigned_driver',
            'assigned_driver': 'picked_up',
            'picked_up': 'out_delivery',
            'out_delivery': 'delivered'
        };

        const newStatus = statusProgression[order.status];
        if (!newStatus) return;

        try {
            // Get auth token for the customer who owns this order
            const authToken = this.authTokens[order.customerId];
            
            await axios.put(
                `${this.config.baseUrls.order}/api/orders/${order.id}/status`,
                { status: newStatus },
                {
                    timeout: 5000,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            order.status = newStatus;

            // Assign driver if status is assigned_driver
            if (newStatus === 'assigned_driver') {
                const availableDriver = this.drivers.find(d => d.status === 'available' && !d.busy);
                if (availableDriver) {
                    availableDriver.status = 'order_assigned';
                    availableDriver.busy = true;
                    availableDriver.targetLocation = this.restaurants.find(r => r.id === order.restaurantId)?.location;
                }
            }
        } catch (error) {
            this.stats.errors.push({
                type: 'ORDER_UPDATE',
                error: error.message,
                timestamp: new Date()
            });
        }
    }

    /**
     * Log simulation progress
     */
    logProgress() {
        const runtime = (Date.now() - this.startTime) / 1000;
        const gpsRate = this.stats.totalGPSEvents / runtime;
        
        this.stats.avgResponseTime = this.stats.responseTimes.length > 0 
            ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length 
            : 0;

        console.log(`📊 Runtime: ${Math.floor(runtime)}s | GPS: ${this.stats.totalGPSEvents} (${gpsRate.toFixed(1)}/s) | Orders: ${this.stats.totalOrders} | Errors: ${this.stats.errors.length} | Avg Response: ${this.stats.avgResponseTime.toFixed(0)}ms`);
    }

    /**
     * Stop the simulation
     */
    async stop() {
        console.log('\n🛑 Stopping simulation...');
        this.isRunning = false;

        await this.generateReport();
        console.log('✅ Simulation completed!');
        
        process.exit(0);
    }

    /**
     * Generate and save simulation report
     */
    async generateReport() {
        const endTime = new Date();
        const runtime = (endTime - this.startTime) / 1000;
        
        const report = {
            simulation: {
                startTime: this.startTime.toISOString(),
                endTime: endTime.toISOString(),
                durationSeconds: runtime,
                configuration: this.config
            },
            performance: {
                totalGPSEvents: this.stats.totalGPSEvents,
                successfulGPSEvents: this.stats.successfulGPSEvents,
                failedGPSEvents: this.stats.failedGPSEvents,
                gpsSuccessRate: ((this.stats.successfulGPSEvents / this.stats.totalGPSEvents) * 100).toFixed(2) + '%',
                avgGPSRate: (this.stats.totalGPSEvents / runtime).toFixed(2) + ' events/sec',
                totalOrders: this.stats.totalOrders,
                successfulOrders: this.stats.successfulOrders,
                failedOrders: this.stats.failedOrders,
                orderSuccessRate: this.stats.totalOrders > 0 ? ((this.stats.successfulOrders / this.stats.totalOrders) * 100).toFixed(2) + '%' : '0%',
                avgResponseTime: this.stats.avgResponseTime.toFixed(2) + 'ms',
                p95ResponseTime: this.stats.responseTimes.length > 0 ? this.calculatePercentile(this.stats.responseTimes, 95).toFixed(2) + 'ms' : '0ms',
                p99ResponseTime: this.stats.responseTimes.length > 0 ? this.calculatePercentile(this.stats.responseTimes, 99).toFixed(2) + 'ms' : '0ms'
            },
            errors: this.stats.errors.slice(-50), // Last 50 errors
            summary: {
                driversSimulated: this.drivers.length,
                restaurantsAvailable: this.restaurants.length,
                customersGenerated: this.customers.length,
                totalEventsGenerated: this.stats.totalGPSEvents + this.stats.totalOrders,
                overallSuccessRate: ((this.stats.successfulGPSEvents + this.stats.successfulOrders) / (this.stats.totalGPSEvents + this.stats.totalOrders) * 100).toFixed(2) + '%'
            }
        };

        // Save to file
        const filename = `simulation_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filepath = path.join(__dirname, '..', filename);
        
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));

        // Also update the main simulation results file
        const summaryText = this.generateSummaryText(report);
        await fs.writeFile(path.join(__dirname, '..', 'simulation_results.txt'), summaryText);

        console.log(`\n📄 Report saved to: ${filename}`);
        console.log('📄 Summary updated in: simulation_results.txt');
        
        // Print summary
        console.log('\n📊 SIMULATION SUMMARY');
        console.log('=====================');
        console.log(summaryText);
    }

    /**
     * Generate summary text for results file
     */
    generateSummaryText(report) {
        return `=== SWIFT EATS LOAD SIMULATION RESULTS ===
Started: ${report.simulation.startTime}
Ended: ${report.simulation.endTime}
Duration: ${Math.floor(report.simulation.durationSeconds)} seconds

CONFIGURATION
=============
Drivers: ${report.simulation.configuration.maxDrivers}
Target Events/Second: ${report.simulation.configuration.eventsPerSecond}
Duration: ${report.simulation.configuration.simulationDurationMinutes} minutes

PERFORMANCE METRICS
===================
GPS Events: ${report.performance.totalGPSEvents} total (${report.performance.successfulGPSEvents} successful, ${report.performance.failedGPSEvents} failed)
GPS Success Rate: ${report.performance.gpsSuccessRate}
Actual GPS Rate: ${report.performance.avgGPSRate}

Orders: ${report.performance.totalOrders} total (${report.performance.successfulOrders} successful, ${report.performance.failedOrders} failed)
Order Success Rate: ${report.performance.orderSuccessRate}

Response Times:
- Average: ${report.performance.avgResponseTime}
- 95th Percentile: ${report.performance.p95ResponseTime}
- 99th Percentile: ${report.performance.p99ResponseTime}

SUMMARY
=======
Drivers Simulated: ${report.summary.driversSimulated}
Restaurants Available: ${report.summary.restaurantsAvailable}
Total Events Generated: ${report.summary.totalEventsGenerated}
Overall Success Rate: ${report.summary.overallSuccessRate}
Total Errors: ${report.errors.length}

SYSTEM DEMONSTRATED
===================
✅ High-throughput GPS data ingestion
✅ Real-time location processing
✅ Order creation and lifecycle management
✅ Driver assignment simulation
✅ Performance monitoring and metrics
✅ Error handling and recovery
`;
    }

    // Utility methods
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomFloat(min, max, decimals = 2) {
        return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
    }

    randomChoice(array, count = 1) {
        if (count === 1) {
            return array[Math.floor(Math.random() * array.length)];
        }
        
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    generateId() {
        return 'sim_' + Math.random().toString(36).substr(2, 9);
    }

    calculateDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.degreesToRadians(coord2.latitude - coord1.latitude);
        const dLon = this.degreesToRadians(coord2.longitude - coord1.longitude);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.degreesToRadians(coord1.latitude)) * Math.cos(this.degreesToRadians(coord2.latitude)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

    calculateBearing(coord1, coord2) {
        const dLon = this.degreesToRadians(coord2.longitude - coord1.longitude);
        const y = Math.sin(dLon) * Math.cos(this.degreesToRadians(coord2.latitude));
        const x = Math.cos(this.degreesToRadians(coord1.latitude)) * Math.sin(this.degreesToRadians(coord2.latitude)) -
                Math.sin(this.degreesToRadians(coord1.latitude)) * Math.cos(this.degreesToRadians(coord2.latitude)) * Math.cos(dLon);
        
        const bearing = this.radiansToDegrees(Math.atan2(y, x));
        return (bearing + 360) % 360;
    }

    moveTowardsTarget(current, target, distanceKm) {
        const bearing = this.calculateBearing(current, target);
        return this.moveInDirection(current, bearing, distanceKm);
    }

    moveInDirection(coord, bearingDegrees, distanceKm) {
        const R = 6371; // Earth's radius in km
        const bearing = this.degreesToRadians(bearingDegrees);
        const lat1 = this.degreesToRadians(coord.latitude);
        const lon1 = this.degreesToRadians(coord.longitude);

        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceKm/R) +
                              Math.cos(lat1) * Math.sin(distanceKm/R) * Math.cos(bearing));
        const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(distanceKm/R) * Math.cos(lat1),
                                     Math.cos(distanceKm/R) - Math.sin(lat1) * Math.sin(lat2));

        return {
            latitude: parseFloat(this.radiansToDegrees(lat2).toFixed(6)),
            longitude: parseFloat(this.radiansToDegrees(lon2).toFixed(6))
        };
    }

    degreesToRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    radiansToDegrees(radians) {
        return radians * (180/Math.PI);
    }

    calculatePercentile(arr, percentile) {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }

    /**
     * Get authentication token for a customer
     */
    getAuthToken(customerId) {
        return this.authTokens[customerId] || this.authTokens[1]; // Fallback to first customer (ID: 1)
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const config = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        
        if (key && value) {
            if (key === 'drivers') config.maxDrivers = parseInt(value);
            if (key === 'rate') config.eventsPerSecond = parseInt(value);
            if (key === 'duration') config.simulationDurationMinutes = parseInt(value);
        }
    }

    console.log('🎯 Swift Eats Data Simulator v1.0.0');
    console.log('====================================');

    const simulator = new SwiftEatsSimulator(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n⚡ Received interrupt signal...');
        simulator.stop();
    });

    process.on('SIGTERM', () => {
        console.log('\n\n⚡ Received termination signal...');
        simulator.stop();
    });

    // Start simulation
    simulator.start().catch(error => {
        console.error('❌ Simulation failed:', error);
        process.exit(1);
    });
}

module.exports = SwiftEatsSimulator;
