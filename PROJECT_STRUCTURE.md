# Swift Eats - Project Structure

## Overview
This document outlines the project structure for the Swift Eats food delivery platform, explaining the purpose of each folder and key modules based on the current implementation.

## Services Overview

### Core Microservices
1. **Restaurant Service** (Port 3002)
   - Restaurant discovery and menu management
   - Geospatial search and filtering
   - Food item catalog management
   - Caching with Redis

2. **Order Service** (Port 3003)
   - Order creation and lifecycle management
   - Payment processing (mocked)
   - Driver assignment coordination
   - Kafka-based asynchronous communication

3. **GPS Service** (Port 3004)
   - High-throughput GPS data ingestion
   - Driver location updates (2,000 events/second)
   - Data validation and enrichment
   - Kafka message publishing

4. **Location Service** (Port 3005)
   - Real-time location processing
   - ETA calculations
   - Server-Sent Events (SSE) for live updates
   - Redis geospatial queries

5. **Driver Assignment Service** (Port 3006)
   - Driver assignment algorithms
   - Priority-based assignment logic
   - Optimistic concurrency control
   - Assignment coordination

### Infrastructure Services
6. **PostgreSQL Database**
   - Primary data store with PostGIS
   - ACID compliance for transactions
   - Geospatial indexing
   - JSONB support

7. **Redis Cache**
   - Session management
   - Geospatial data caching
   - Real-time data storage
   - Pub/Sub messaging

8. **Apache Kafka**
   - Event streaming platform
   - Order-driver assignment messaging
   - GPS data streaming
   - High-throughput message processing

9. **Nginx API Gateway** (Production)
   - Load balancing
   - Rate limiting
   - Request routing
   - SSE proxy configuration

### Management & Monitoring
10. **Kafka UI**
    - Kafka topic management
    - Message monitoring
    - Consumer group management

11. **Redis Commander**
    - Redis data visualization
    - Cache management
    - Real-time monitoring

## Project Organization

```
swift-eats/
├── docs/                           # Documentation files
│   ├── ARCHITECTURE.md            # System architecture and design decisions
│   ├── IMPLEMENTATION.md          # Implementation details and code examples
│   ├── LOCATION_SERVICES.md       # GPS and Location Services documentation
│   ├── ORDER_ASSIGNMENT_COMMUNICATION.md # Order-Driver Assignment communication
│   ├── API-SPECIFICATION.yml      # OpenAPI specification for all endpoints
│   └── PROJECT_STRUCTURE.md       # This file - project organization
├── src/                           # Source code for all microservices
│   ├── controllers/               # API controllers
│   │   ├── foodItemController.js  # Food item management
│   │   ├── orderController.js     # Order processing and management
│   │   ├── restaurantController.js # Restaurant and menu management
│   │   ├── searchController.js    # Search functionality
│   │   └── trackingController.js  # Order tracking
│   ├── middleware/                # Express middleware
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Error handling
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── validation.js         # Request validation
│   ├── routes/                   # API route definitions
│   │   ├── foodItems.js          # Food item routes
│   │   ├── orders.js             # Order routes
│   │   ├── restaurants.js        # Restaurant routes
│   │   ├── search.js             # Search routes
│   │   └── tracking.js           # Tracking routes
│   ├── services/                 # Business logic services
│   │   ├── restaurantService.js  # Restaurant service layer
│   │   ├── gpsService.js         # GPS data ingestion service
│   │   ├── locationService.js    # Location processing service
│   │   └── driverAssignmentService.js # Driver assignment logic
│   ├── utils/                    # Utility modules
│   │   ├── database.js           # Database connection and queries
│   │   ├── logger.js             # Logging utility
│   │   ├── redis.js              # Redis client and cache utilities
│   │   ├── kafka.js              # Kafka client and messaging
│   │   ├── assignmentMessaging.js # Order-Driver assignment messaging
│   │   └── repositories.js       # Database repository patterns
│   ├── server.js                 # Main API server
│   ├── restaurantServer.js       # Restaurant Service standalone server
│   ├── orderServer.js            # Order Service standalone server
│   ├── gpsServer.js              # GPS Service standalone server
│   ├── locationServer.js         # Location Service standalone server
│   └── driverAssignmentServer.js # Driver Assignment Service standalone server
├── database/                      # Database schemas and setup
│   └── schema.sql                # PostgreSQL schema definitions
├── scripts/                       # Utility scripts and setup
│   ├── initDb.js                 # Database initialization
│   ├── init-db.sql               # SQL initialization script
│   ├── docker-setup.sh           # Docker setup automation
│   ├── testLocationServices.js   # GPS/Location services testing
│   ├── testOrderAssignment.js    # Order assignment testing
│   ├── testSSEEfficiency.js      # SSE vs polling efficiency test
│   └── search_body.json          # Search test data
├── examples/                      # Example implementations
│   └── customerAppSSE.js         # SSE client example
├── nginx/                         # Nginx configuration
│   └── nginx.conf                # API Gateway configuration
├── logs/                          # Application logs
│   ├── combined.log              # Combined application logs
│   └── error.log                 # Error logs
├── docker-compose.yml            # Development environment setup
├── docker-compose.prod.yml       # Production environment setup
├── Dockerfile                    # Multi-stage Docker build
├── healthcheck.js                # Docker health check script
├── package.json                  # Node.js dependencies and scripts
├── package-lock.json             # Dependency lock file
├── env.example                   # Environment variables template
├── postman_collection.json       # API testing collection
├── commands.txt                  # Development commands
├── README.md                     # Project overview and setup
├── ARCHITECTURE.md               # System architecture documentation
├── IMPLEMENTATION.md             # Implementation details
└── .gitignore                    # Git ignore patterns
```

## Microservices Architecture

### 1. Restaurant Service (`src/restaurantServer.js`)
**Purpose**: Handle restaurant discovery, menu management, and search functionality

**Key Responsibilities**:
- Restaurant CRUD operations
- Food item management
- Location-based restaurant discovery
- Search functionality (restaurant name, cuisine, food type)
- Menu availability management

**Technology Stack**:
- Backend: Node.js/Express
- Database: PostgreSQL with PostGIS
- Caching: Redis
- Search: PostgreSQL GIN indexes

**Key Endpoints**:
- `GET /api/restaurants` - List restaurants with filtering
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu
- `GET /api/search` - Search restaurants and food items
- `GET /api/food-items` - List food items

**Port**: 3002

### 2. Order Service (`src/orderServer.js`)
**Purpose**: Handle order processing, lifecycle management, and driver assignment

**Key Responsibilities**:
- Order creation and validation
- Order status management
- Payment processing (mocked)
- Driver assignment coordination
- Order lifecycle management

**Technology Stack**:
- Backend: Node.js/Express
- Database: PostgreSQL (ACID compliance)
- Message Queue: Apache Kafka
- Transaction Management: Database-level transactions with optimistic concurrency control

**Key Endpoints**:
- `POST /api/orders` - Create new order
- `GET /api/orders` - List customer orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/tracking/:orderId` - Get order tracking info

**Port**: 3003

### 3. GPS Service (`src/gpsServer.js`)
**Purpose**: High-throughput GPS data ingestion from driver applications

**Key Responsibilities**:
- GPS data ingestion from driver apps
- Data validation and enrichment
- Geo-region mapping
- Kafka message publishing

**Technology Stack**:
- Backend: Node.js/Express
- Message Queue: Apache Kafka
- Data Processing: Real-time stream processing

**Key Endpoints**:
- `POST /api/gps/update` - Update driver location
- `POST /api/gps/batch` - Batch location updates
- `GET /health` - Health check

**Port**: 3004

### 4. Location Service (`src/locationServer.js`)
**Purpose**: Process GPS events, update cache, calculate ETAs, and provide real-time location data

**Key Responsibilities**:
- GPS event processing
- Redis cache management
- ETA calculations
- Real-time location delivery via Server-Sent Events (SSE)
- Analytics aggregation

**Technology Stack**:
- Backend: Node.js/Express
- Message Queue: Apache Kafka
- Caching: Redis with geospatial queries
- Real-time: Server-Sent Events (SSE)

**Key Endpoints**:
- `GET /api/location/driver/:driverId` - Get driver location
- `GET /api/location/nearby` - Find nearby drivers
- `GET /api/eta/order/:orderId` - Get order ETA
- `GET /sse/location/:customerId` - SSE connection for real-time updates
- `GET /sse/subscribe/driver/:customerId/:driverId` - Subscribe to driver location
- `GET /sse/subscribe/order/:customerId/:orderId` - Subscribe to order ETA

**Port**: 3005

### 5. Driver Assignment Service (`src/driverAssignmentServer.js`)
**Purpose**: Handle driver assignment logic and coordination

**Key Responsibilities**:
- Driver assignment algorithm
- Priority-based assignment
- Optimistic concurrency control
- Assignment coordination with Order Service

**Technology Stack**:
- Backend: Node.js/Express
- Message Queue: Apache Kafka
- Database: Redis for driver data
- Concurrency Control: Optimistic locking

**Key Endpoints**:
- `POST /api/assignment/manual` - Manual driver assignment (testing)
- `GET /health` - Health check
- `GET /stats` - Assignment statistics

**Port**: 3006

## Communication Architecture

### Kafka-Based Asynchronous Communication
**Order Service ↔ Driver Assignment Service**:
- **Topics**: Geo-scoped topics (e.g., `driver-assignment-nyc`, `driver-assignment-london`)
- **Messages**:
  - `AssignmentRequested` - Order service requests driver assignment
  - `DriverAssigned` - Driver assignment service confirms assignment
  - `AssignmentFailed` - Driver assignment service reports failure
- **Partitioning**: Round-robin for load distribution
- **Concurrency Control**: Optimistic concurrency control to prevent double assignments

### GPS Data Flow
**GPS Service → Location Service**:
- **Topic**: `driver-location-updates`
- **Partitioning**: Hash-based by `driver_id` for ordered messages per driver
- **Throughput**: 2,000 events/second (10,000 drivers × 1 update/5 seconds)
- **Data Flow**: GPS Service → Kafka → Location Service → Redis Cache → Customer App (SSE)

## Shared Components

### Database (`database/`)
**Purpose**: Centralized database schemas and connection management

**Contents**:
- `schema.sql` - PostgreSQL table definitions with PostGIS extensions
- Tables: `restaurants`, `food_items`, `orders`, `drivers`, `customers`
- Features: Geospatial indexing, JSONB support, optimistic concurrency control

### Utils (`src/utils/`)
**Purpose**: Common utility functions and shared components

**Contents**:
- `database.js` - PostgreSQL connection and query utilities
- `logger.js` - Structured logging with Winston
- `redis.js` - Redis client and cache utilities
- `kafka.js` - Kafka client and messaging utilities
- `assignmentMessaging.js` - Order-Driver assignment messaging
- `repositories.js` - Database repository patterns

### Middleware (`src/middleware/`)
**Purpose**: Express middleware components

**Contents**:
- `auth.js` - JWT authentication middleware
- `errorHandler.js` - Global error handling
- `rateLimiter.js` - Rate limiting middleware
- `validation.js` - Request validation using Joi

## Infrastructure

### Docker Setup
**Development Environment** (`docker-compose.yml`):
- PostgreSQL with PostGIS
- Redis
- Apache Kafka with Zookeeper
- Kafka UI (management interface)
- Redis Commander (Redis management)
- All microservices with hot reloading

**Production Environment** (`docker-compose.prod.yml`):
- Resource limits and replicas
- Nginx API Gateway
- Health checks
- Production-ready configurations

### API Gateway (Nginx)
**Purpose**: Load balancing, rate limiting, and request routing

**Features**:
- Upstream service definitions
- Rate limiting
- Security headers
- SSE-specific proxy settings
- Health check endpoints

## Testing Strategy

### Test Scripts (`scripts/`)
- `testLocationServices.js` - GPS and Location Services testing
- `testOrderAssignment.js` - Order assignment communication testing
- `testSSEEfficiency.js` - SSE vs polling efficiency comparison

### Example Implementations (`examples/`)
- `customerAppSSE.js` - Server-Sent Events client example

## Development Workflow

### Local Development
- `npm run restaurant:dev` - Start Restaurant Service
- `npm run order:dev` - Start Order Service
- `npm run gps:dev` - Start GPS Service
- `npm run location:dev` - Start Location Service
- `npm run driver-assignment:dev` - Start Driver Assignment Service

### Docker Development
- `docker-compose up` - Start all services
- `docker-compose down` - Stop all services
- `./scripts/docker-setup.sh` - Automated setup and testing

### Testing
- Postman collection for API testing
- Automated test scripts for service communication
- Performance testing for SSE vs polling

## Key Features Implemented

### 1. Real-Time Location Tracking
- **GPS Service**: Handles 2,000 events/second from 10,000 concurrent drivers
- **Location Service**: Processes GPS data and provides real-time updates
- **SSE Implementation**: Efficient real-time delivery to customer apps
- **Redis Geospatial**: Fast location-based queries

### 2. Driver Assignment System
- **Kafka Communication**: Asynchronous order-driver assignment
- **Optimistic Concurrency Control**: Prevents double driver assignments
- **Priority-Based Assignment**: Considers preparation time and ETA
- **Geo-Scoped Topics**: Regional driver assignment optimization

### 3. Restaurant Discovery
- **Geospatial Search**: Location-based restaurant discovery
- **Full-Text Search**: Restaurant and food item search
- **Caching**: Redis-based caching for performance
- **Menu Management**: Dynamic menu updates

### 4. Order Processing
- **ACID Compliance**: Database-level transaction management
- **Status Tracking**: Complete order lifecycle management
- **Driver Coordination**: Seamless driver assignment integration
- **Real-Time Updates**: Live order status updates

## Capacity and Performance

### Throughput Requirements
- **Order Processing**: 500 orders/minute (8.3 QPS peak)
- **GPS Updates**: 2,000 events/second (10,000 drivers)
- **Restaurant Browsing**: P99 < 200ms response time
- **Order Processing**: P99 < 500ms response time

### Storage Requirements
- **Restaurants**: 45 GB (100,000 restaurants)
- **Drivers**: 800 GB (4,000,000 drivers)
- **Customers**: 3 TB (15,000,000 customers)
- **Orders**: 144 GB/day (with archival strategy)

## Future Enhancements

### Planned Features
- Mobile application development
- Advanced analytics and reporting
- Machine learning for ETA optimization
- Real-time traffic integration
- Multi-language support

### Scalability Improvements
- Service mesh implementation (Istio)
- Advanced caching strategies
- Database sharding (when needed)
- CDN integration
- Advanced load balancing

## Benefits of Current Architecture

1. **Microservices**: Independent scaling and deployment
2. **Event-Driven**: Loose coupling through Kafka messaging
3. **Real-Time**: Efficient SSE-based location updates
4. **Scalable**: Designed for high throughput and concurrent users
5. **Fault-Tolerant**: Service isolation and graceful degradation
6. **Observable**: Comprehensive logging and monitoring
7. **Developer-Friendly**: Hot reloading and easy local development
