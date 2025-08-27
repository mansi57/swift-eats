# GPS and Location Services

This document describes the implementation of the GPS Service and Location Service for Swift Eats, designed to handle real-time driver location updates and provide location-based APIs.

## Architecture Overview

```
Driver App → GPS Service → Kafka → Location Service → Redis Cache → Customer App
```

### GPS Service
- **Purpose**: High-throughput ingestion of GPS location data from driver apps
- **Target Load**: 2,000 events/second peak (10,000 concurrent drivers, 5-second intervals)
- **Processing Time**: 10-25ms per event
- **Instances**: 5-10 instances for load distribution

### Location Service
- **Purpose**: Real-time processing of GPS events, cache updates, and location APIs
- **Target Load**: 2,000 events/second peak
- **Processing Time**: 5-13ms per event
- **Workers**: 10-20 workers for parallel processing

## Services Implementation

### GPS Service (`src/services/gpsService.js`)

#### Key Features
- **High-throughput ingestion**: Validates and enriches GPS data
- **Kafka publishing**: Publishes to geo-scoped topics (`driver_location.{geo}`)
- **Batch processing**: Supports batch location updates (up to 100 per batch)
- **Health monitoring**: Real-time statistics and health checks
- **Error handling**: Comprehensive error handling and logging

#### API Endpoints
- `POST /gps/location` - Single location update
- `POST /gps/location/batch` - Batch location updates
- `GET /health` - Health check
- `GET /stats` - Service statistics

#### Sample Request
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

### Location Service (`src/services/locationService.js`)

#### Key Features
- **Kafka consumption**: Processes GPS events from geo-scoped topics
- **Redis cache updates**: Stores driver locations and status
- **ETA calculations**: Real-time ETA updates for active orders
- **Geospatial queries**: Nearby driver discovery using Redis GEO
- **Analytics aggregation**: Driver activity metrics

#### API Endpoints
- `GET /location/driver/:driverId` - Get driver location
- `GET /location/nearby` - Find nearby drivers
- `GET /location/order/:orderId/eta` - Get order ETA
- `GET /location/driver/:driverId/status` - Get driver status
- `GET /location/analytics/driver-activity` - Driver activity analytics
- `GET /health` - Health check
- `GET /stats` - Service statistics

#### Sample Response (Driver Location)
```json
{
  "success": true,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "accuracy": 5.0,
    "speed": 25.0,
    "heading": 180,
    "batteryLevel": 85,
    "lastUpdate": "2024-01-15T10:30:05.000Z"
  }
}
```

## Running the Services

### Prerequisites
- Kafka cluster running (default: localhost:9092)
- Redis server running (default: localhost:6379)
- Node.js 18+ and npm

### Environment Variables
```bash
# GPS Service
GPS_SERVICE_PORT=3002
KAFKA_HOST=localhost:9092
SERVICE_INSTANCE_ID=gps-1

# Location Service
LOCATION_SERVICE_PORT=3003
KAFKA_HOST=localhost:9092
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Starting Services

#### Development Mode
```bash
# Terminal 1: GPS Service
npm run gps:dev

# Terminal 2: Location Service
npm run location:dev
```

#### Production Mode
```bash
# Terminal 1: GPS Service
npm run gps:start

# Terminal 2: Location Service
npm run location:start
```

### Testing the Services
```bash
# Run the test script (requires both services to be running)
npm run test:location
```

## Data Flow

### 1. GPS Data Ingestion
1. Driver app sends location update to GPS Service
2. GPS Service validates and enriches the data
3. GPS Service publishes to Kafka topic `driver_location.{geo}`
4. Response sent back to driver app

### 2. Location Processing
1. Location Service consumes GPS events from Kafka
2. Updates Redis cache with driver location and status
3. Triggers ETA recalculation for active orders
4. Aggregates analytics data

### 3. Location Queries
1. Customer app requests driver location
2. Location Service queries Redis cache
3. Returns real-time location data

## Cache Structure

### Redis Keys
- `driver_locations` - GEO set for nearby driver queries
- `driver:{driverId}:location` - Detailed driver location (TTL: 5min)
- `driver:{driverId}:status` - Driver status (TTL: 5min)
- `driver:{driverId}:active_orders` - Driver's active orders
- `order:{orderId}:eta` - Order ETA (TTL: 5min)
- `order:{orderId}:details` - Order details for ETA calculation
- `analytics:driver_activity:{date}` - Daily driver activity metrics

## Performance Characteristics

### GPS Service
- **Throughput**: 15-150 events/second per instance
- **Latency**: 10-25ms per event
- **Memory**: ~50-100MB per instance
- **CPU**: Moderate (JSON parsing, validation, Kafka publishing)

### Location Service
- **Throughput**: 30-300 events/second per worker
- **Latency**: 5-13ms per event
- **Memory**: ~100-200MB per worker
- **CPU**: Moderate (Redis operations, ETA calculations)

## Monitoring and Observability

### Health Checks
Both services provide health check endpoints that return:
- Service status (healthy/unhealthy)
- Uptime
- Events processed/failed
- Events per second
- Last event time
- Connection status (Kafka, Redis)

### Metrics
- Events processed per second
- Processing latency (P50, P95, P99)
- Error rates
- Cache hit/miss ratios
- Kafka lag

### Logging
- Request/response logging
- Error logging with stack traces
- Performance warnings for slow events
- Connection status changes

## Scaling Strategy

### Horizontal Scaling
- **GPS Service**: Add more instances behind load balancer
- **Location Service**: Add more workers in consumer group
- **Kafka**: Add more partitions for geo-topics
- **Redis**: Add read replicas for location queries

### Vertical Scaling
- Increase CPU/memory for high-traffic regions
- Optimize Kafka producer/consumer configurations
- Tune Redis memory and connection settings

## Error Handling

### GPS Service
- Invalid location data → 400 Bad Request
- Kafka connection issues → 503 Service Unavailable
- Processing errors → 500 Internal Server Error

### Location Service
- Cache misses → 404 Not Found
- Invalid coordinates → 400 Bad Request
- Redis/Kafka issues → 503 Service Unavailable

## Security Considerations

### Data Protection
- GPS data encrypted in transit (HTTPS)
- Redis connections secured
- Kafka authentication enabled
- Input validation and sanitization

### Rate Limiting
- Per-driver rate limiting
- Batch size limits
- Request size limits

## Future Enhancements

### Planned Features
- **Geofencing**: Automatic status updates based on location
- **Route optimization**: Integration with routing services
- **Predictive ETA**: ML-based arrival time predictions
- **Real-time notifications**: WebSocket support for live updates
- **Advanced analytics**: Driver behavior analysis

### Performance Optimizations
- **Compression**: GPS data compression
- **Caching**: Multi-level caching strategy
- **Batching**: Optimized batch processing
- **Partitioning**: Dynamic topic partitioning
