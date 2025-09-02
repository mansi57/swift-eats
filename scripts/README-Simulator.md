# Swift Eats Data Simulator

A comprehensive data simulator for the Swift Eats food delivery platform that can generate realistic load testing scenarios with up to 50 drivers generating 10 events per second to demonstrate system functionality.

## Features

🚗 **Realistic Driver Simulation**
- 50 simulated drivers with realistic movement patterns
- GPS location updates with configurable frequency
- Driver status transitions (available, assigned, delivering, etc.)
- Battery level simulation and network type variation

📦 **Order Lifecycle Simulation**
- Automatic order creation from simulated customers
- Order status progression through the complete lifecycle
- Driver assignment simulation
- Restaurant and menu data generation

📊 **Performance Monitoring**
- Real-time metrics collection
- Response time tracking (average, P95, P99)
- Success/failure rate monitoring
- Error logging and categorization

📈 **Load Testing Capabilities**
- Configurable event rates (up to 20+ events/second)
- Scalable driver count (1-100+ drivers)
- Adjustable simulation duration
- Stress testing scenarios

## Quick Start

### Prerequisites

Make sure the Swift Eats services are running in Docker:

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or if using production compose
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose ps
```

Services should be accessible at:
- **Orders Service**: http://localhost:3001
- **Restaurant Service**: http://localhost:3002  
- **GPS Service**: http://localhost:3003
- **Location Service**: http://localhost:3004
- **Driver Assignment**: http://localhost:3005

### Run Predefined Simulations

```bash
# Light load test (10 drivers, 2 events/sec, 2 minutes)
node scripts/runSimulation.js light

# Medium load test (25 drivers, 5 events/sec, 3 minutes)
node scripts/runSimulation.js medium

# Heavy load test (50 drivers, 10 events/sec, 5 minutes)
node scripts/runSimulation.js heavy

# Stress test (100 drivers, 20 events/sec, 2 minutes)
node scripts/runSimulation.js stress
```

### Custom Simulations

```bash
# Custom configuration
node scripts/runSimulation.js --drivers 30 --rate 8 --duration 4

# Target specification (50 drivers, 10 events/sec)
node scripts/runSimulation.js --drivers 50 --rate 10 --duration 5

# Custom service ports
node scripts/runSimulation.js heavy --gps-port 3004 --order-port 3005
```

### Direct Script Usage

```bash
# Run the simulator directly
node scripts/dataSimulator.js --drivers 50 --rate 10 --duration 5

# With custom service URLs
node scripts/dataSimulator.js --drivers 25 --rate 5
```

## Configuration Options

| Option | Description | Default | Range |
|--------|-------------|---------|-------|
| `--drivers` | Number of drivers to simulate | 50 | 1-100+ |
| `--rate` | GPS events per second | 10 | 1-50+ |
| `--duration` | Simulation duration (minutes) | 5 | 1-60+ |
| `--gps-port` | GPS service port | 3002 | 1024-65535 |
| `--order-port` | Order service port | 3003 | 1024-65535 |

## Simulation Details

### Driver Simulation

The simulator creates realistic driver behavior:

- **Movement Patterns**: Urban, highway, and mixed driving patterns
- **Speed Variation**: Realistic speed changes based on traffic conditions  
- **Direction Changes**: Natural turning and route adjustments
- **Stop Simulation**: Traffic lights, pickups, and drop-offs
- **Battery Drain**: Realistic battery level decreases over time

### GPS Data Generation

Each GPS event includes:

```json
{
  "driverId": "driver_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "accuracy": 5.0,
  "speed": 25.0,
  "heading": 180,
  "altitude": 10,
  "batteryLevel": 85,
  "networkType": "4G"
}
```

### Order Lifecycle

Orders progress through realistic statuses:

1. `new_order` → Order created
2. `order_received` → Restaurant confirms
3. `food_preparing` → Kitchen preparation
4. `ready_pickup` → Food ready for pickup
5. `assigned_driver` → Driver assigned
6. `picked_up` → Driver collected food
7. `out_delivery` → En route to customer
8. `delivered` → Order completed

## Results and Monitoring

### Real-time Monitoring

During simulation, you'll see live progress:

```
📊 Runtime: 45s | GPS: 2250 (50.0/s) | Orders: 15 | Errors: 0 | Avg Response: 25ms
```

### Detailed Reports

After completion, detailed reports are generated:

- **JSON Report**: `simulation_results_YYYY-MM-DD-HH-mm-ss.json`
- **Summary**: Updated `simulation_results.txt`

### Report Contents

```
=== SWIFT EATS LOAD SIMULATION RESULTS ===
Started: 2024-01-15T10:30:00.000Z
Duration: 300 seconds

PERFORMANCE METRICS
===================
GPS Events: 15000 total (14950 successful, 50 failed)
GPS Success Rate: 99.67%
Actual GPS Rate: 50.0 events/sec

Orders: 75 total (73 successful, 2 failed)
Order Success Rate: 97.33%

Response Times:
- Average: 45ms
- 95th Percentile: 120ms
- 99th Percentile: 250ms

SYSTEM DEMONSTRATED
===================
✅ High-throughput GPS data ingestion
✅ Real-time location processing
✅ Order creation and lifecycle management
✅ Driver assignment simulation
✅ Performance monitoring and metrics
✅ Error handling and recovery
```

## Use Cases

### Development Testing
```bash
# Quick functionality test
node scripts/runSimulation.js light
```

### Load Testing
```bash
# Target load test
node scripts/runSimulation.js heavy

# Sustained load
node scripts/runSimulation.js --drivers 50 --rate 10 --duration 15
```

### Stress Testing
```bash
# High load burst
node scripts/runSimulation.js stress

# Custom stress test
node scripts/runSimulation.js --drivers 100 --rate 25 --duration 3
```

### Performance Benchmarking
```bash
# Baseline performance
node scripts/runSimulation.js medium --duration 10

# Compare configurations
node scripts/runSimulation.js --drivers 25 --rate 5 --duration 10
node scripts/runSimulation.js --drivers 50 --rate 5 --duration 10
```

## Architecture Integration

The simulator integrates with the Swift Eats microservices architecture:

```
Simulator → GPS Service → Kafka → Location Service → Redis
        → Order Service → Database → Driver Assignment
```

### Service Dependencies

- **GPS Service** (port 3002): Receives location updates
- **Order Service** (port 3003): Handles order creation and updates
- **Location Service** (port 3005): Processes GPS events (optional)
- **Kafka**: Message queuing (automatic)
- **Redis**: Location caching (automatic)
- **PostgreSQL**: Order storage (automatic)

## Troubleshooting

### Common Issues

**Services Not Running**
```
❌ GPS Service is not available (http://localhost:3002/health)
```
**Solution**: Start the required services first

**High Error Rates**
```
📊 Runtime: 30s | GPS: 1500 (50.0/s) | Orders: 10 | Errors: 150 | Avg Response: 5000ms
```
**Solution**: Reduce load or check system resources

**Connection Timeouts**
```
Error: timeout of 5000ms exceeded
```
**Solution**: Check network connectivity and service health

### Debug Mode

Add debug logging by setting environment variable:
```bash
DEBUG=simulator node scripts/runSimulation.js light
```

### Custom Service URLs

For different environments:
```bash
# Default Docker setup (automatically configured)
node scripts/dataSimulator.js --drivers 10 --rate 2

# Custom ports if needed
node scripts/runSimulation.js heavy --gps-port 3003 --order-port 3001

# Custom environment
node scripts/runSimulation.js heavy --gps-url http://custom-host:8003 --order-url http://custom-host:8001
```

## Performance Expectations

### Target Metrics (50 drivers, 10 events/sec)

| Metric | Expected | Good | Excellent |
|--------|----------|------|-----------|
| GPS Success Rate | >95% | >98% | >99.5% |
| Avg Response Time | <100ms | <50ms | <25ms |
| P95 Response Time | <300ms | <150ms | <75ms |
| Order Success Rate | >90% | >95% | >98% |
| Memory Usage | <500MB | <300MB | <200MB |

### Scaling Guidelines

| Load Level | Drivers | Events/sec | Duration | Use Case |
|------------|---------|------------|----------|----------|
| Light | 10 | 2 | 2-5 min | Development |
| Medium | 25 | 5 | 3-10 min | Integration |
| Heavy | 50 | 10 | 5-15 min | Load Testing |
| Stress | 100+ | 20+ | 1-5 min | Stress Testing |

The simulator successfully demonstrates the Swift Eats platform's ability to handle real-world food delivery loads while providing comprehensive metrics for performance analysis.
