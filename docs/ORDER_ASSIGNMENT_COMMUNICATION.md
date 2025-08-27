# Order Service and Driver Assignment Service Communication

This document describes the asynchronous communication between the Order Service and Driver Assignment Service using Kafka, as designed in the Swift Eats architecture.

## Architecture Overview

```
Order Service → Kafka → Driver Assignment Service → Kafka → Order Service
```

### Communication Flow
1. **Order Creation**: Order Service creates an order and publishes driver assignment request
2. **Driver Assignment**: Driver Assignment Service processes the request and assigns a driver
3. **Response**: Driver Assignment Service publishes assignment result back to Order Service
4. **Order Update**: Order Service updates the order with driver information

## Services Implementation

### Order Service Integration

#### Driver Assignment Request Publishing
When an order is created and payment is completed, the Order Service automatically publishes a driver assignment request:

```javascript
// In OrderController.createOrder()
const assignmentRequest = {
  orderId: orderId,
  restaurantLatitude: restaurantLocation.latitude,
  restaurantLongitude: restaurantLocation.longitude,
  customerLatitude: customerLocation.latitude,
  customerLongitude: customerLocation.longitude,
  preparationTime: prepTimeRemaining,
  radius: 5, // Default search radius in km
  items: orderItems,
  totalAmount: totalAmount,
  specialInstructions: specialInstructions
};

await publisher.publishAssignmentRequested(assignmentRequest);
```

#### Assignment Response Handling
The Order Service listens for assignment responses and updates orders accordingly:

```javascript
// In OrderController.handleDriverAssigned()
static async handleDriverAssigned(event) {
  const { orderId, driverId, eta } = event;
  
  // Update order with driver assignment
  await updateOrderWithDriver(orderId, driverId, eta);
}
```

### Driver Assignment Service

#### Request Processing
The Driver Assignment Service consumes assignment requests and processes them:

```javascript
// In DriverAssignmentService.processAssignmentRequest()
async processAssignmentRequest(message) {
  const request = JSON.parse(message.value);
  
  // Find available drivers
  const availableDrivers = await this.findAvailableDrivers(
    request.restaurantLatitude,
    request.restaurantLongitude,
    request.radius
  );
  
  // Prioritize drivers based on slack time and distance
  const prioritizedDrivers = await this.prioritizeDrivers(
    availableDrivers,
    request.restaurantLatitude,
    request.restaurantLongitude,
    request.preparationTime,
    request.customerLatitude,
    request.customerLongitude
  );
  
  // Attempt to assign driver
  const result = await this.attemptDriverAssignment(
    request.orderId,
    prioritizedDrivers,
    request
  );
  
  // Send response
  if (result.success) {
    await this.sendDriverAssigned(request.orderId, result.driverId, result.eta);
  } else {
    await this.sendAssignmentFailed(request.orderId, result.error);
  }
}
```

#### Driver Prioritization Algorithm
Drivers are prioritized based on multiple factors:

```javascript
calculatePriorityScore(slack, distance, totalETA) {
  let score = 100; // Base score
  
  // Slack factor: positive slack is good, negative is bad
  if (slack > 0) {
    score += Math.min(slack * 10, 50); // Bonus for positive slack
  } else {
    score -= Math.abs(slack) * 20; // Penalty for negative slack
  }
  
  // Distance factor: closer is better
  score -= distance * 5;
  
  // ETA factor: shorter is better
  score -= totalETA * 2;
  
  return Math.max(score, 0);
}
```

## Kafka Topics

### Request Topics
- **Pattern**: `driver_assignment.requests.{geo}`
- **Example**: `driver_assignment.requests.4_-7` (for coordinates 40.7128, -74.0060)
- **Purpose**: Order Service publishes assignment requests

### Response Topics
- **Topic**: `driver_assignment.responses`
- **Purpose**: Driver Assignment Service publishes assignment results

## Message Schemas

### Assignment Request Message
```json
{
  "eventId": "uuid",
  "eventType": "AssignmentRequested",
  "occurredAt": "2024-01-15T10:30:00.000Z",
  "orderId": "order_123",
  "geoKey": "4_-7",
  "restaurantLatitude": 40.7128,
  "restaurantLongitude": -74.0060,
  "customerLatitude": 40.7589,
  "customerLongitude": -73.9851,
  "preparationTime": 15,
  "radius": 5,
  "items": [...],
  "totalAmount": 34.97,
  "specialInstructions": "Please deliver to front door"
}
```

### Assignment Success Response
```json
{
  "orderId": "order_123",
  "driverId": "driver_456",
  "eta": 25,
  "assignedAt": "2024-01-15T10:30:05.000Z",
  "status": "assigned"
}
```

### Assignment Failure Response
```json
{
  "orderId": "order_123",
  "error": "No available drivers in area",
  "failedAt": "2024-01-15T10:30:05.000Z",
  "status": "failed"
}
```

## Running the Services

### Prerequisites
- Kafka cluster running (default: localhost:9092)
- Redis server running (default: localhost:6379)
- PostgreSQL database running
- Node.js 18+ and npm

### Environment Variables
```bash
# Order Service
PORT=3000
KAFKA_HOST=localhost:9092
REDIS_HOST=localhost
REDIS_PORT=6379
DATABASE_URL=postgresql://user:pass@localhost:5432/swift_eats

# Driver Assignment Service
DRIVER_ASSIGNMENT_SERVICE_PORT=3004
KAFKA_HOST=localhost:9092
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Starting Services

#### Development Mode
```bash
# Terminal 1: Order Service
npm run dev

# Terminal 2: Driver Assignment Service
npm run driver-assignment:dev
```

#### Production Mode
```bash
# Terminal 1: Order Service
npm start

# Terminal 2: Driver Assignment Service
npm run driver-assignment:start
```

### Testing the Communication
```bash
# Run the test script (requires both services to be running)
npm run test:order-assignment
```

## Data Flow Details

### 1. Order Creation and Assignment Request
1. Customer creates order through Order Service
2. Order Service validates order and processes payment
3. Order Service publishes assignment request to Kafka
4. Order status remains "new_order" until driver assignment

### 2. Driver Assignment Processing
1. Driver Assignment Service consumes assignment request
2. Service finds available drivers in the specified radius
3. Service calculates priority scores for each driver
4. Service attempts to assign the highest priority driver
5. Service publishes assignment result to Kafka

### 3. Order Update
1. Order Service consumes assignment response
2. If successful, order status updated to "assigned_driver"
3. Driver information and ETA added to order
4. Driver status updated to busy
5. Relevant caches cleared

## Error Handling

### Assignment Failures
- **No available drivers**: Service returns failure response
- **All drivers busy**: Service returns failure response
- **Invalid coordinates**: Request rejected with error
- **Service errors**: Internal error logged and failure response sent

### Retry Logic
- Failed assignments can be retried by the Order Service
- Exponential backoff for retry attempts
- Maximum retry attempts to prevent infinite loops

### Dead Letter Queue
- Failed messages sent to DLQ for manual inspection
- Monitoring and alerting for DLQ messages
- Manual reprocessing capabilities

## Monitoring and Observability

### Health Checks
Both services provide health check endpoints:
- `GET /health` - Service health status
- `GET /stats` - Service statistics and metrics

### Metrics
- Assignment request rate
- Assignment success/failure rates
- Processing latency (P50, P95, P99)
- Driver availability metrics
- Kafka lag monitoring

### Logging
- Request/response logging
- Error logging with stack traces
- Performance warnings for slow processing
- Assignment decision logging

## Performance Characteristics

### Order Service
- **Throughput**: 15-150 orders/second
- **Latency**: 100-500ms for order creation
- **Kafka Publishing**: 10-50ms per request

### Driver Assignment Service
- **Throughput**: 30-300 assignments/second
- **Latency**: 200-1000ms for assignment processing
- **Driver Search**: 50-200ms per request
- **Priority Calculation**: 10-50ms per driver

## Scaling Strategy

### Horizontal Scaling
- **Order Service**: Add more instances behind load balancer
- **Driver Assignment Service**: Add more workers in consumer group
- **Kafka**: Add more partitions for geo-topics
- **Redis**: Add read replicas for driver location queries

### Vertical Scaling
- Increase CPU/memory for high-traffic regions
- Optimize Kafka producer/consumer configurations
- Tune Redis memory and connection settings

## Security Considerations

### Data Protection
- Assignment requests encrypted in transit
- Driver location data protected
- Order information secured
- Authentication and authorization required

### Rate Limiting
- Per-customer rate limiting for order creation
- Per-service rate limiting for assignment requests
- Kafka message size limits

## Future Enhancements

### Planned Features
- **Real-time driver availability**: WebSocket updates
- **Predictive assignment**: ML-based driver selection
- **Dynamic pricing**: Surge pricing based on driver availability
- **Batch assignments**: Optimize multiple order assignments
- **Geofencing**: Automatic driver status updates

### Performance Optimizations
- **Caching**: Multi-level caching for driver data
- **Batching**: Batch assignment requests
- **Compression**: Kafka message compression
- **Partitioning**: Dynamic topic partitioning
