# Swift Eats - Food Delivery Platform Architecture

## Overview
Swift Eats is a real-time food delivery platform designed to handle high-throughput order processing, low-latency restaurant browsing, and real-time order tracking with driver location updates.

## Architecture Summary

### **Core Workload Characteristics**

**Restaurant Browsing**: Latency-critical, read-heavy, cache-dependent
- **Primary Focus**: Response time optimization (P99 < 200ms)
- **Database Load**: High read volume, low write volume
- **Cache Strategy**: Aggressive caching for menu data
- **Scaling**: Scale for latency, not throughput

**Order Processing**: Throughput-critical, write-heavy, transaction-critical
- **Primary Focus**: System capacity and throughput (500 orders/minute)
- **Database Load**: High write volume, moderate read volume
- **Cache Strategy**: Minimal caching (transaction-critical data)
- **Scaling**: Scale for throughput, latency secondary

### **Key Design Principles**
- **Microservices Architecture**: Independent scaling of different workloads
- **Event-Driven Communication**: Kafka for asynchronous service communication
- **Multi-Layer Caching**: Redis for performance optimization
- **ACID Compliance**: PostgreSQL for transaction-critical operations
- **Real-Time Updates**: Kafka streams for live order tracking
Swift Eats is a real-time food delivery platform designed to handle high-throughput order processing, low-latency restaurant browsing, and real-time order tracking with driver location updates.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App  │  Restaurant App  │  Driver App  │  Admin App  │
└────────────────────┴──────────────┴──────────────────┴──────────────┴──────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  API GATEWAY                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Rate Limiting  │  JWT Auth  │  Request Routing  │  CORS  │  Security Headers    │
└────────────────────┴──────────┴───────────────────┴────────┴──────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  LOAD BALANCER                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Health Checks  │  Traffic Distribution  │  SSL Termination  │  Health Monitoring │
└────────────────────┴──────────────────────┴───────────────────┴─────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               MICROSERVICES LAYER                                 │
├─────────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│  Restaurant Service │  Orders Service │  Auth Service   │  Driver Assignment      │
│                     │                 │                 │                         │
│  • Restaurant CRUD  │  • Order Mgmt   │  • JWT Auth     │  • Driver Selection     │
│  • Menu Management  │  • Status Flow  │  • User Mgmt    │  • Order-Driver Match   │
│  • Location Search  │  • Payment      │  • Permissions  │  • Load Balancing       │
│  • Search Indexing  │  • Validation   │  • Sessions     │  • Performance Tracking │
└─────────────────────┴─────────────────┴─────────────────┴─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SPECIALIZED SERVICES                                │
├─────────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│  Search Service     │  GPS Service    │  Location Service│  ETA Service           │
│                     │                 │                 │                         │
│  • Unified Search   │  • GPS Ingestion│  • GPS Processing│  • ETA Calculations   │
│  • GIN + ES         │  • Coordinate   │  • Live Cache   │  • Distance/Time       │
│  • Smart Caching    │    Validation   │  • ETA Triggers │  • Traffic Analysis    │
│  • Analytics        │  • Driver Auth  │  • Location APIs│  • ML Predictions      │
└─────────────────────┴─────────────────┴─────────────────┴─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 SEARCH SERVICE                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL GIN  │  Elasticsearch  │  Result Caching  │  Search Analytics      │
│  • Basic Search  │  • Advanced     │  • Location Keys │  • Query Patterns      │
│  • Full-Text     │    Search       │  • TTL Expiry    │  • Performance Metrics │
│  • JSON Search   │  • Fuzzy Match  │  • Invalidation  │                         │
└────────────────────┴─────────────────┴──────────────────┴─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 DATA LAYER                                        │
├─────────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│  PostgreSQL (Main)  │  Redis Cache    │  Kafka Streams  │  S3 Storage            │
│                     │                 │                 │                         │
│  • ACID Compliance │  • Hot Data     │  • Order Events │  • Images & Media      │
│  • PostGIS Ext.    │  • Search Cache │  • GPS Updates  │  • Static Assets       │
│  • Read Replicas   │  • Session Mgmt │  • Real-time    │  • CDN Integration     │
│  • Location Shards │  • Rate Limiting│    Notifications│                         │
└─────────────────────┴─────────────────┴─────────────────┴─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               REAL-TIME LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Kafka Consumers  │  Event Processors  │  Notification Service  │  Push Service     │
│                   │                    │                        │                   │
│  • Order Updates │  • Status Changes  │  • Email/SMS          │  • In-App Alerts  │
│  • GPS Streaming │  • Driver Assign   │  • Push Notifications │  • Real-time      │
│  • Event Ordering│  • ETA Updates     │  • Order Tracking     │  • Status Updates │
└─────────────────────┴───────────────────┴────────────────────┴─────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   restaurants   │    │   food_items    │    │     orders      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ _id (PK)        │◄───┤ restaurant_id   │    │ _id (PK)        │
│ name            │    │ restaurant_name │    │ customer_id     │
│ location        │    │ restaurant_     │    │ restaurant_id   │
│ tags (JSONB)    │    │   location      │    │ driver_id       │
│ pictures        │    │ _id (PK)        │    │ items (JSONB)   │
│ rating          │    │ name            │    │ current_status  │
│ operating_hours │    │ type            │    │ total_amount    │
│ is_open         │    │ tags (JSONB)    │    │ destination     │
└─────────────────┘    │ price           │    └─────────────────┘
                       │ available       │              │
                       └─────────────────┘              │
                                                       │
                       ┌─────────────────┐              │
                       │   customers     │              │
                       ├─────────────────┤              │
                       │ _id (PK)        │◄─────────────┘
                       │ name            │
                       │ location        │
                       │ contact         │
                       │ rating          │
                       └─────────────────┘
                                                       │
                       ┌─────────────────┐              │
                       │    drivers      │              │
                       ├─────────────────┤              │
                       │ _id (PK)        │◄─────────────┘
                       │ name            │
                       │ location        │
                       │ current_order   │
                       │ status          │
                       │ current_location│
                       └─────────────────┘

┌─────────────────────────┐
│ food_item_inventory     │
├─────────────────────────┤
│ _id (PK)                │
│ restaurant_id (FK)      │◄───┐
│ food_item_id (FK)       │◄───┼───┐
│ item_type               │    │   │
│ available_quantity      │    │   │
│ max_prepared_quantity   │    │   │
│ preparation_time        │    │   │
│ version                 │    │   │
│ last_updated            │    │   │
└─────────────────────────┘    │   │
                               │   │
                               ▼   ▼
                       ┌─────────────────┐
                       │   restaurants   │
                       └─────────────────┘
```

## Data Flow Architecture

### **1. Restaurant Browsing Flow**
```
Customer Request → API Gateway → Load Balancer → Restaurant Service → Cache Check → Database → Response
                                    ↓
                              Redis Cache (Hit)
                                    ↓
                              Response (P99 < 200ms)
```

### **2. Order Processing Flow**
```
Order Request → API Gateway → Auth Service → Orders Service → Database Transaction → Kafka Event → Response
                                    ↓
                              Payment Processing (Mocked)
                                    ↓
                              Order Status Update
                                    ↓
                              Driver Assignment Request (Kafka)
```

### **3. Real-Time Tracking Flow**
```
Driver GPS → GPS Service → Kafka Topic → Location Service → Redis Cache → Customer App
Order Update → Orders Service → Kafka Topic ↗
                                     ↓
                               Real-Time Updates
```

### **4. Search Flow**
```
Search Request → API Gateway → Search Service → Cache Check → PostgreSQL GIN → Result Aggregation → Response
                                    ↓
                              Redis Cache (Location-based Keys)
                                    ↓
                              Elasticsearch (Future)
```

### **5. Restaurant Service → ETA Service Communication Flow**
```
Restaurant Update → Restaurant Service → Priority Queue → ETA Service → ETA Recalculation → Order Updates
     ↓
Menu Changes → Restaurant Service → Priority Queue → ETA Service → ETA Recalculation → Order Updates
     ↓
Location Changes → Restaurant Service → Priority Queue → ETA Service → ETA Recalculation → Order Updates
                                    ↓
                              Batch Processing (50 orders/batch)
                                    ↓
                              Kafka: order_updates topic
                                    ↓
                              Customer receives updated ETA
```

## Architectural Pattern: Microservices Architecture

### Why Microservices?
- **Independent Scaling**: Different components have different scaling requirements
- **Technology Diversity**: Each service can use the most appropriate technology stack
- **Fault Isolation**: Failure in one service doesn't cascade to others
- **Team Autonomy**: Different teams can develop and deploy services independently
- **Performance Optimization**: Each service can be optimized for its specific use case

## System Components

### 1. Restaurant Service
**Purpose**: Handle restaurant and food item browsing, search, and discovery

**Characteristics**:
- Read-heavy workload
- High traffic volume
- Requires low latency (P99 < 200ms)
- Eventual consistency acceptable
- Location-based queries

**Responsibilities**:
- Restaurant CRUD operations
- Food item management
- Location-based restaurant discovery
- Search functionality (restaurant name, cuisine, food type)
- Menu management

**Technology Stack**:
- Database: PostgreSQL with PostGIS extension
- Caching: Redis for hot data
- Search: PostgreSQL GIN indexes + Elasticsearch (for scale)
- API: RESTful endpoints

**Scaling Strategy**:
- Location-based sharding
- Read replicas for hot shards
- CDN for static content (images)

### 2. Orders Service
**Purpose**: Handle order processing, lifecycle management, and business logic

**Characteristics**:
- High consistency requirements
- ACID transactions
- Concurrency handling
- Low latency
- High throughput (500 orders/minute)

**Responsibilities**:
- Order creation and validation
- Order status management
- Payment processing (mocked)
- Business rule enforcement
- Order lifecycle management

**Technology Stack**:
- Database: PostgreSQL (ACID compliance)
- Message Queue: Redis Pub/Sub or Apache Kafka
- API: RESTful endpoints
- Transaction Management: Database-level transactions

**Scaling Strategy**:
- Horizontal scaling with load balancers
- Database connection pooling
- Message queue for async processing

### 3. Search Service
**Purpose**: Handle complex search queries and provide unified search interface

**Characteristics**:
- Read-heavy workload
- Complex query processing
- Result aggregation and ranking
- Location-based caching
- High availability requirements

**Responsibilities**:
- Unified search across restaurants and food items
- Multi-criteria search (location + cuisine + price + dietary)
- Result aggregation and smart ranking
- Search analytics and optimization
- Location-based result caching with intelligent invalidation
- Restaurant availability monitoring and cache updates

**Technology Stack**:
- **PostgreSQL GIN**: Full-text search with basic alias support
- **Caching**: Redis for search result caching with location-based keys and TTL
- **Queue Integration**: Kafka for restaurant availability updates and cache invalidation
- **API**: RESTful endpoints for different search types

**Scaling Strategy**:
- **Horizontal Scaling**: 2-6 search service instances
- **Read Replicas**: 1-2 dedicated read replicas for search operations
- **Cache Distribution**: Redis for high-performance caching
- **Load Balancing**: Distribute search requests across instances

**Enhanced Caching Strategy**:
- **TTL-based Expiration**: Default cache expiration with configurable TTL
- **Availability-based Invalidation**: Real-time cache updates when restaurants become unavailable
- **Queue-driven Updates**: Restaurant service pushes availability changes via Kafka
- **Scheduled Polling**: Regular availability checks during peak hours (10 AM - 9 PM)
- **Geographic Invalidation**: Location-based cache invalidation for affected areas

### 4. Driver Assignment Service
**Purpose**: Handle intelligent driver assignment for orders based on multiple factors

**Characteristics**:
- Real-time decision making
- Location-aware assignment
- Multi-criteria optimization
- High availability requirements
- Low latency assignment

**Responsibilities**:
- **Driver Selection**: Based on proximity, availability, and current workload
- **Order-Driver Matching**: Optimal pairing considering preparation time and delivery distance
- **Load Balancing**: Distribute orders evenly across available drivers
- **Real-time Updates**: Handle driver status changes and order reassignments
- **Performance Tracking**: Monitor driver performance and adjust assignment algorithms
- **Fallback Handling**: Manage driver unavailability and order reassignment

**Technology Stack**:
- **Message Queue**: Apache Kafka for order events and driver status updates
- **Geospatial Engine**: PostGIS for real-time distance calculations
- **Caching**: Redis for driver availability and location caching
- **Algorithm Engine**: Custom assignment algorithms with ML-based optimization
- **API**: Internal service endpoints for driver assignment requests

**Scaling Strategy**:
- **Horizontal Scaling**: Multiple assignment engine instances
- **Geographic Partitioning**: Location-based assignment processing
- **Load Balancing**: Distribute assignment requests across instances
- **Caching Layer**: Redis cluster for high-performance driver lookups

### 5. GPS Service
**Purpose**: Handle high-volume GPS ingestion from driver mobile apps

**Characteristics**:
- High-throughput GPS data ingestion
- Real-time coordinate validation
- Driver authentication and rate limiting
- Low-latency processing requirements

**Responsibilities**:
- **GPS Ingestion**: Handle 2,000+ GPS events/second from 10,000 concurrent drivers
- **Coordinate Validation**: Validate GPS coordinates and detect anomalies
- **Driver Authentication**: Verify driver identity and active order status
- **Rate Limiting**: Enforce per-driver rate limits (max 1 update per 3 seconds)
- **Data Enrichment**: Add metadata like timestamp, accuracy, and signal strength
- **Real-time Processing**: Sub-100ms processing for live tracking

**Technology Stack**:
- **API Framework**: Node.js with WebSocket/HTTP endpoints
- **Message Queue**: Apache Kafka for GPS event streaming
- **Authentication**: JWT-based driver authentication
- **Validation**: GPS coordinate validation and anomaly detection
- **Rate Limiting**: Redis-based rate limiting per driver

**Scaling Strategy**:
- **Horizontal Scaling**: 5-10 instances for 2,000+ events/second
- **Per Instance Capacity**: 200-400 events/second
- **Auto-scaling**: Scale based on GPS ingestion latency and error rates
- **Geographic Distribution**: Deploy close to driver concentrations

### 6. Location Service
**Purpose**: Process GPS events and provide real-time location data for customer tracking

**Characteristics**:
- Real-time GPS event processing
- Live location cache management
- ETA recalculation triggers
- Customer-facing location APIs

**Responsibilities**:
- **GPS Event Processing**: Consume and process 2,000+ GPS events/second
- **Live Location Cache**: Update Redis with latest driver locations
- **ETA Recalculations**: Trigger ETA updates based on significant movement
- **Customer Location APIs**: Provide real-time driver location data
- **Analytics Aggregation**: Prepare location data for route optimization
- **Notification Triggers**: Alert customers of significant location changes

**Technology Stack**:
- **Event Processing**: Kafka consumers for GPS event processing
- **Cache Management**: Redis for live location storage
- **Geospatial Processing**: PostGIS for location-based calculations
- **Real-time APIs**: WebSocket/HTTP endpoints for customer access
- **Analytics**: Location data aggregation for insights

**Scaling Strategy**:
- **Worker Pattern**: 10-20 workers for 2,000+ events/second processing
- **Per Worker Capacity**: 100-200 events/second
- **Auto-scaling**: Scale based on consumer lag and processing latency
- **Geographic Distribution**: Co-locate with GPS Service for low latency

### 7. ETA Service (Basic Implementation)
**Purpose**: Calculate delivery ETAs based on distance and preparation time

**Characteristics**:
- Simple distance-based calculations
- PostGIS geospatial functions
- Basic preparation time estimates
- Real-time ETA updates

**Responsibilities**:
- **ETA Calculation**: Using restaurant location, customer location, and food preparation time
- **Distance and Time Calculations**: PostGIS-based geospatial calculations
- **Basic Traffic Adjustment**: Simple traffic multipliers based on time of day
- **ETA Updates**: Real-time ETA adjustments based on order status changes

**Technology Stack**:
- **Message Queue**: Apache Kafka for order events and ETA requests
- **Geospatial Calculations**: PostGIS functions for distance and route calculations
- **Caching**: Redis for ETA result caching
- **API**: Internal service endpoints for ETA requests

**Scaling Strategy**:
- **Simple Worker Pattern**: 2-5 ETA calculation workers
- **Async Processing**: Kafka-based event processing
- **Horizontal Scaling**: Independent scaling of calculation workers
- **Load Balancing**: Distribute ETA requests across worker instances

## Data Architecture

### Database Design: PostgreSQL with PostGIS

**Why PostgreSQL?**
1. **Scalability**: Horizontal and vertical scaling capabilities
2. **JSONB Support**: Efficient storage of flexible restaurant and food item data
3. **ACID Compliance**: Critical for order processing consistency
4. **Geospatial Indexing**: PostGIS extension for location-based queries
5. **Full-Text Search**: Built-in search capabilities with GIN indexes

### Database Schema Design

#### **Restaurants Table**
- **Core Fields**: ID, name, location, tags, pictures, rating, operating hours
- **Geospatial Support**: PostGIS geometry for location-based queries
- **JSONB Tags**: Flexible cuisine and dietary information
- **Indexes**: Location, cuisine, full-text search, and composite indexes

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **Food Items Table**
- **Core Fields**: ID, name, picture, description, type, tags, preparation time, price
- **Denormalized Data**: Restaurant name and location for performance
- **Indexes**: Type, restaurant, full-text search, availability, and price indexes
- **JSONB Tags**: Flexible cuisine and dietary information

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **Orders Table**
- **Core Fields**: ID, customer details, driver details, restaurant details, items, status
- **Denormalized Data**: Customer name, driver name, restaurant name for performance
- **Status Tracking**: Comprehensive order lifecycle status management
- **Geospatial Support**: Destination coordinates for delivery tracking
- **Indexes**: Customer, status, restaurant, and driver indexes

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### Order Data Retention & Archival

**Rationale**:
- Order volume drives rapid data growth; keeping all history in the primary OLTP degrades performance and inflates storage/replication costs.

**Policy**:
- Maintain a hot window of 30–90 days of orders in PostgreSQL (OLTP).
- Partition `orders` by time (daily or monthly) and optionally sub-partition by geo for manageability.
- Apply compression to warm partitions (older than 30 days) if using extensions that support it.
- Archive partitions older than the hot window to S3 as Parquet for analytics (Athena/Glue/BigQuery-compatible).
- Preserve necessary aggregates in OLTP if needed for quick lookups; perform long-horizon analysis on the data lake.

**Operational Flow**:
1. Nightly job seals prior-day partition.
2. Export sealed partition to Parquet in S3 with partitioned paths (e.g., `s3://bucket/orders/yyyymmdd/geo=...`).
3. Verify export and register/update external table metadata.
4. Drop or detach archived OLTP partition to reclaim space.

### Capacity Estimations

#### **Storage Capacity**

**Restaurants**: 150,000 restaurants × 0.3 MB = 45 GB

**Food Items**: 150,000 restaurants × 50 items × 0.1 MB = 750 GB

**Drivers**: 4,000,000 drivers × 0.2 MB = 800 GB

**Customers**: 15,000,000 customers × 0.2 MB = 3 TB

**Orders**: 500 orders/min × 0.2 MB × 60 × 24 = 144 GB/day

**Total Storage (with 2× index overhead)**: ~11 TB

**With 3× replication**: ~33 TB

**Recommendation**: Keep hot window (30-90 days) for orders in OLTP; archive older data to S3/Parquet.

#### **Simplified Architecture Approach**

**Target Load**: 8.3 orders/second (500 orders/minute) peak capacity

**Design Philosophy**: 
- Start simple, scale when needed
- Avoid over-engineering for initial deployment
- Focus on core food delivery functionality
- Maintain ability to scale 10-20x for future growth

**Key Simplifications**:
- Reduced service instances (2-20 per service instead of 10-200)
- Simplified Kafka partitioning (300 partitions instead of 2,000+)
- Smaller Redis footprint (10-50 GB instead of 100-500 GB)
- Fewer read replicas (1-3 instead of 5-20)
- Basic PostgreSQL GIN search (no Elasticsearch initially)
- Simple optimistic locking (no complex concurrency controls)

#### **Traffic & Throughput**

**Restaurant Browsing Traffic (Latency-Focused)**:
- Average: 1,000 requests/minute (60,000/hour)
- Peak: 5,000 requests/minute (300,000/hour) during meal times
- Cache hit ratio target: 80% for restaurant/menu data
- **Latency Target**: P99 < 200ms for menu endpoints
- **Focus**: Response time optimization, not throughput

**Order Processing Traffic (Throughput-Focused)**:
- **Target Throughput**: 500 orders per minute (8.3 QPS) peak capacity
- Average: 100-200 orders/minute (1.7-3.3 QPS)
- Burst: 2,000 orders/minute (33.3 QPS) during special events
- Payment success rate: 95%
- Order lifecycle: 6-8 status updates per order
- **Latency Target**: P99 < 500ms for order creation
- **Focus**: System capacity and throughput planning

**Driver Assignment**:
- Orders needing assignment: 8.3-33/second (matches order rate)
- Driver pool: 4M drivers, ~1% active at peak (40K concurrent)
- Assignment SLA: P95 < 5s, P99 < 10s
- Reassignment rate: 5-10% (driver decline/timeout)

**Driver Location Updates**:
- **Target Load**: 10,000 concurrent drivers, each updating every 5 seconds
- **Peak Throughput**: 2,000 GPS events/second (10,000 drivers ÷ 5 seconds)
- **Payload Size**: ~200 bytes per update (lat/lng, timestamp, driver_id, order_id)
- **Data Volume**: 400 KB/second, 24 MB/minute, 1.4 GB/hour
- **Real-time Requirements**: Customer-facing live driver location tracking

**Kafka Topics & Partitions**:
- Geo areas: 20 major cities/zones
- Partitions per geo: 6-24 (busy areas get more)
- Total partitions: ~300 across all assignment topics
- Retention: 24-48h for requests, 7d for events, 14d for DLQ

#### **Database Performance**

**PostgreSQL Requirements**:
- **Write Throughput**: 200-800 writes/second (orders + status updates)
- **Read Throughput**: 5,000-20,000 reads/second (browsing + search)
- **Connection Pool**: 50-100 connections per service
- **Critical Transaction SLA**: P99 < 100ms for order placement

**Redis Cache**:
- **Memory**: 10-50 GB for hot data (restaurants, menus, search results)
- **Hit Ratio Targets**: 80% for restaurant data, 70% for search results
- **Key Count**: ~5M keys across all namespaces
- **TTL**: 15-30 minutes for search, 1-2 hours for restaurant data

#### **Workload-Specific Performance**

**Restaurant Browsing (Latency-Critical)**:
- **Primary Focus**: Response time optimization
- **Database Load**: High read volume, low write volume
- **Cache Strategy**: Aggressive caching for menu data
- **Performance Target**: P99 < 200ms for menu endpoints

**Order Processing (Throughput-Critical)**:
- **Primary Focus**: Transaction throughput and reliability
- **Database Load**: High write volume, moderate read volume
- **Cache Strategy**: Minimal caching (transaction-critical data)
- **Performance Target**: 500 orders/minute capacity, P99 < 500ms

#### **Infrastructure Scaling**

**Service Instances**:
- **Restaurant Service**: 2-5 instances (read-heavy, latency-critical, cache-dependent)
- **Orders Service**: 3-10 instances (write-heavy, throughput-critical, transaction-critical)
- **Search Service**: 2-6 instances (CPU-intensive, cache-dependent)
- **Driver Assignment**: 5-20 instances (geo-distributed, real-time)
- **GPS Service**: 5-10 instances (high-throughput, real-time, GPS ingestion)
- **Location Service**: 10-20 workers (real-time, GPS processing)

**Scaling Strategy by Workload**:
- **Restaurant Browsing**: Scale for latency (P99 < 200ms), not throughput
- **Order Processing**: Scale for throughput (500 orders/minute), latency secondary
- **Search**: Scale for both latency and throughput
- **Driver Assignment**: Scale for real-time processing and geographic distribution
- **GPS Service**: Scale for high throughput (2,000 events/second) and low latency (< 100ms)
- **Location Service**: Scale for real-time processing and customer-facing latency (< 200ms)

**Database Scaling**:
- Primary: 1 instance (write-heavy)
- Read replicas: 1-3 instances (distributed by geo/load)
- Connection pooling: PgBouncer or similar for connection management

**Kafka Cluster**:
- Brokers: 5-15 brokers (depending on geo distribution and GPS load)
- Partitions: 350+ total partitions across all topics (including 50-100 for GPS)
- Replication factor: 3 for reliability
- Storage: 200-800 GB for hot topics (including GPS data with retention policies)

#### **Network & Bandwidth**

**API Traffic**:
- Inbound: 10-50 Mbps average, 100-200 Mbps peak
- Outbound: 20-80 Mbps average, 200-400 Mbps peak
- CDN: 80% of static content served via CDN

**Inter-service Communication**:
- Kafka: 10-40 Mbps (event streaming including GPS data)
- Database: 10-50 Mbps (read/write operations)
- Cache: 20-100 Mbps (Redis operations including location cache)

#### **Monitoring & Observability**

**Metrics Volume**:
- Application metrics: 1,000-5,000 data points/minute
- Business metrics: 100-500 events/minute
- Log volume: 1-5 GB/day (structured logging)

**Alerting Thresholds**:
- API latency: P99 > 200ms (warning), P99 > 500ms (critical)
- Error rate: > 1% (warning), > 5% (critical)
- Database lag: > 10s (warning), > 30s (critical)
- Cache hit ratio: < 70% (warning), < 50% (critical)

#### **Customers Table**
- **Core Fields**: ID, name, location, contact, rating
- **Geospatial Support**: PostGIS geometry for location-based queries
- **Rating System**: Customer rating tracking for quality assurance
- **Indexes**: Geospatial index for location-based queries
- **Location Strategy**: GPS-based location updates, not stored in database

**Customer Location Handling**:
- **Real-time Updates**: Location updated via GPS when user opens the app
- **No Persistent Storage**: Customer location not stored in database for privacy
- **Session-based Location**: Location maintained in application session/cache
- **Privacy Compliance**: Follows GDPR and privacy regulations
- **Performance**: Eliminates database writes for location updates

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **Drivers Table**
- **Core Fields**: ID, name, location, rating, busy status, current order
- **Status Tracking**: Comprehensive driver status management
- **Geospatial Support**: Current location for real-time tracking
- **Indexes**: Location, availability, and status indexes

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **Food Item Inventory Table**
- **Core Fields**: ID, restaurant reference, food item reference, item type, quantities
- **Item Types**: Prepared items vs. made-to-order items
- **Optimistic Locking**: Version field for concurrent access control
- **Constraints**: Unique constraint on restaurant-food item combination
- **Indexes**: Fast lookups for restaurant-item combinations and availability

*Note: Complete implementation details are available in IMPLEMENTATION.md*

*Note: Complete database schema implementation details are available in IMPLEMENTATION.md*

### Shard-Readiness (No Sharding Initially)

**Decision**: We will not shard initially for `restaurants`, `drivers`, or `customers`. However, we will make the schema and access layer shard-ready.

**Readiness Measures**:
- Add `geo_key` to `restaurants`, `drivers`, and `customers` to encode city/zone/geohash.
- Create composite indexes beginning with `geo_key` for common queries.
- Use UUIDs for globally unique identifiers.
- Encapsulate data access via repository interfaces to support future per-geo routing without code rewrites.
- Keep service logic stateless; any geo routing decision is made in the repository layer.

### Data Model Strategy: Denormalized for Performance

#### **Inventory Management Strategy**

**Why Separate Inventory Table?**
- **Normalization**: Prevents data duplication and maintains consistency
- **Performance**: Dedicated indexes for inventory queries
- **Flexibility**: Easy to add inventory-specific features (replenishment, alerts)
- **Scalability**: Can handle high-volume inventory updates efficiently

**Inventory Types**:
1. **Pre-prepared Items**: Fixed quantity available, automatic replenishment
2. **Made-to-order Items**: Capacity-based availability, tracks current order load

**Optimistic Concurrency Control for Inventory**:
- **Version Field**: Each inventory record has a version number
- **Conflict Detection**: Updates fail if version doesn't match (indicating concurrent modification)
- **Immediate Reservation**: Quantity reduced as soon as item is selected
- **Transaction Rollback**: Failed orders automatically restore inventory

**Why Optimistic Concurrency Control?**
- **Read-Heavy System**: Most operations are reads (browsing, searching)
- **Low Contention**: Unlikely that multiple users order same item simultaneously
- **Better Performance**: No blocking locks during normal operations
- **User Experience**: Immediate feedback on availability

### **Optimistic Concurrency Control Trade-offs**

**Advantages**:
- **High Performance**: No blocking during normal operations
- **Scalability**: Better performance under high read loads
- **User Experience**: Immediate feedback and no waiting
- **Resource Efficiency**: No lock management overhead

**Disadvantages**:
- **Retry Logic**: Failed orders need to be retried
- **Complexity**: More complex error handling and rollback logic
- **Potential Conflicts**: Users might experience "item no longer available" errors

**When to Use**:
- **Low Contention**: Few simultaneous updates to same resources
- **Read-Heavy Workloads**: Most operations are reads
- **Performance Critical**: Response time is more important than retry complexity
- **User Experience**: Immediate feedback is preferred over waiting

**Alternative Approaches Considered**:
- **Pessimistic Locking**: Would block users during order placement
- **Database-Level Locks**: Would reduce concurrency and performance
- **Queue-Based**: Would add latency and complexity

**Tables**:
1. **restaurants**: Restaurant details with embedded food item information
2. **food_items**: Food item details with restaurant information
3. **orders**: Order details with embedded item, restaurant, and customer information
4. **customers**: Customer information
5. **drivers**: Driver information and current status

**Denormalization Benefits**:
- Reduced JOIN operations for faster queries
- Better performance for read-heavy operations
- Simplified query patterns

**Sharding Strategy**:
- Location-based sharding for restaurants and food items
- Multiple replicas for hot shards
- Consistent hashing for shard distribution

### Database Indexing Strategy

#### **Primary Indexes**
- **Geospatial Indexes**: PostGIS GIST indexes for all location fields
- **Full-Text Search**: GIN indexes for restaurant and food item names
- **JSONB Indexes**: GIN indexes for flexible tag-based filtering

#### **Composite Indexes**
- **Cuisine + Location**: For efficient cuisine-based proximity searches
- **Type + Restaurant**: For food item filtering within restaurants

#### **Performance Indexes**
- **Availability**: Partial indexes for available food items
- **Status**: For order status filtering
- **Price**: For price-based filtering and sorting

#### **Read Replicas**
- **Restaurant Service**: Multiple read replicas for high-traffic browsing
- **Hot Shard Replicas**: Additional replicas for popular geographic areas

## ETA Service Architecture

### ETA Service Overview
The ETA Service is a sophisticated microservice designed to provide accurate delivery time estimates by combining multiple data sources and using advanced algorithms.

### **ETA Calculation Components**

#### **1. Base ETA Calculation**
- **PostGIS Functions**: Distance calculations using ST_Distance
- **Travel Time Estimation**: Based on distance and average city speed
- **Buffer Time**: 15-minute safety buffer for unexpected delays

#### **2. Traffic-Aware ETA Calculation**
- **Real-time Traffic Integration**: Multiple traffic API sources
- **Historical Patterns**: Time-based traffic analysis
- **Dynamic Adjustments**: Real-time ETA updates based on conditions

#### **3. Demand Prediction Integration**
- **Machine Learning Models**: LSTM-based preparation time prediction
- **Feature Engineering**: Time, day, order volume patterns
- **Continuous Learning**: Model updates based on actual delivery times

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### **ETA Service Integration Points**

#### **Queue-Based Communication with Restaurant Service**

**Why Queue-Based Communication?**
- **Asynchronous Processing**: Restaurant updates don't block ETA calculations
- **Decoupling**: Services can operate independently
- **Reliability**: Messages persist until processed
- **Scalability**: Can handle bursts of restaurant updates

**Queue Architecture**:
- **Topics**: Restaurant info changes, menu updates, location changes, operating hours, ratings
- **Message Structure**: Event type, restaurant ID, timestamp, changes, affected orders
- **Data Format**: JSON-based messages with structured change tracking

*Note: Complete implementation details are available in IMPLEMENTATION.md*

**Queue Processing Strategy**:
1. **Priority Queuing**: Critical updates (location, operating hours) processed first
2. **Batch Processing**: Multiple updates processed together for efficiency
3. **Dead Letter Queue**: Failed messages retried with exponential backoff
4. **Message Ordering**: Location-based partitioning for geographic updates

**Queue Configuration**:
- **Priority Levels**: High (location, operating hours), medium (menu), low (ratings)
- **Partitioning**: Location-based strategy with 10 partitions
- **Performance**: Batch size 100, 30s timeout, 5 concurrent consumers
- **Reliability**: 3 retries with exponential backoff and dead letter queue

*Note: Complete implementation details are available in IMPLEMENTATION.md*

**Queue Monitoring and Metrics**:
- **QueueMonitor Class**: Monitors queue health and performance
- **Metrics Collection**: Message count, consumer count, processing rates
- **Health Status**: Determines queue health and generates alerts

*Note: Complete implementation details are available in IMPLEMENTATION.md*

**Implementation Example**:
- **RestaurantUpdatePublisher**: Publishes restaurant updates to queue with priority
- **RestaurantUpdateConsumer**: Consumes updates and triggers ETA recalculations
- **Batch Processing**: Efficient processing of multiple ETA updates

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **1. Order Service Integration**
- **Flow**: Order Creation → Orders Service → ETA Service → Response
- **Events**: Kafka-based order creation events
- **Processing**: ETA calculation and publication to order updates topic
- **Delivery**: Customer receives updated ETA information

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **2. Restaurant Service Integration**
- **Flow**: Restaurant updates flow through queue to ETA service
- **Queue Types**: Redis/Kafka for asynchronous communication
- **Update Types**: Restaurant info, menu changes, location updates
- **Processing**: ETA service processes updates and recalculates affected orders

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **2. Real-Time ETA Updates**
- **Event Publishing**: Kafka-based ETA update events
- **Push Notifications**: Immediate customer notifications
- **Dynamic Updates**: Real-time ETA adjustments

#### **3. Traffic Data Integration**
- **Multiple APIs**: Google Maps, Waze, OpenStreetMap
- **Data Aggregation**: Combined traffic information
- **Reliability**: Fallback mechanisms for API failures

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### **ETA Service Data Model**

#### **ETA Calculations Table**
- **Order Tracking**: Links ETA calculations to specific orders
- **Location Data**: Restaurant and customer coordinates for distance calculations
- **Time Components**: Preparation, travel, and buffer time tracking
- **Traffic Data**: Real-time traffic conditions and historical patterns
- **Indexes**: Optimized for order-based and location-based queries

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **Traffic Patterns Table**
- **Route Data**: Origin and destination coordinates for traffic analysis
- **Time Patterns**: Hour-based and day-of-week traffic variations
- **Performance Metrics**: Speed, congestion, and confidence scoring
- **Indexes**: Composite and geospatial indexes for efficient lookups

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### **ETA Service API Endpoints**

#### **1. ETA Calculation Endpoints**
- **POST /eta/calculate**: Calculate initial ETA for new orders
- **PUT /eta/update/{orderId}**: Update ETA based on new conditions
- **GET /eta/{orderId}**: Get current ETA for specific orders
- **GET /eta/history/{orderId}**: Get ETA change history

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **2. Traffic Data Endpoints**
- **GET /eta/traffic/{origin}/{destination}**: Get current traffic conditions
- **GET /eta/patterns/{origin}/{destination}**: Get historical traffic patterns
- **POST /eta/traffic/feedback**: Submit traffic feedback for improvement

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### **ETA Service Performance Considerations**

#### **1. Caching Strategy**
- **ETA Results**: 5-minute TTL for ETA calculations
- **Traffic Data**: 1-minute TTL for real-time traffic information
- **Location Patterns**: Longer TTL for historical traffic data
- **Cache Keys**: Order-specific and location-based cache keys

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **2. Batch Processing**
- **Batch Size**: 100 orders per batch for efficient processing
- **Parallel Processing**: Concurrent ETA calculations within batches
- **Memory Management**: Controlled memory usage through batching
- **Performance**: Optimized for high-volume ETA requests

*Note: Complete implementation details are available in IMPLEMENTATION.md*

#### **3. Load Balancing**
- **Replicas**: 3 minimum replicas for high availability
- **Resources**: 512Mi-1Gi memory, 250m-500m CPU allocation
- **Auto-scaling**: 3-10 replicas based on 70% CPU utilization target
- **Performance**: Optimized resource allocation for ETA calculations

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### **ETA Service Monitoring and Metrics**

#### **1. Key Performance Indicators**
- **ETA Accuracy**: Difference between predicted and actual delivery times
- **Calculation Latency**: Time to calculate ETA (target: < 100ms)
- **Traffic Data Freshness**: Age of traffic data used in calculations
- **Confidence Score Distribution**: Distribution of ETA confidence scores

#### **2. Business Metrics**
- **Customer Satisfaction**: Impact of accurate ETAs on ratings
- **Order Completion Rate**: Orders completed within ETA window
- **Driver Efficiency**: Driver route optimization through better ETAs
- **Restaurant Planning**: Preparation time optimization based on demand patterns

This comprehensive ETA service architecture provides accurate, real-time delivery estimates while maintaining high performance and scalability for the Swift Eats platform.

## Real-Time Architecture

### Event-Driven Updates with Kafka

**Real-Time Update Strategy**:
1. **Kafka Event Streaming**: High-throughput message processing for order and driver updates
2. **Push Notifications**: Immediate delivery of critical updates (order status, driver assignment)
3. **In-App Polling**: Periodic status checks for real-time updates (fallback mechanism)
4. **Email/SMS**: Non-critical notifications and order confirmations

**Kafka Architecture (Recommended for Scale)**:
- **Topics**: 
  - `order_updates`: Order status changes and lifecycle events
  - `driver_location`: GPS updates and driver status changes
  - `customer_notifications`: Customer-specific event aggregation
  - `driver_assignment.requests.{geo}`: Order-ready or payment-complete events by geo area
  - `driver_assignment.events.{geo}`: Assignment decisions/updates by geo area
- **Partitions**: One partition per order for parallel processing
- **Consumer Groups**: Service-specific consumers for different update types

**Driver Assignment Topic Strategy**:
- **Geo-Scoped Topics**: Separate topics per geographic area (e.g., city/zone) to localize traffic and reduce fan-out.
- **Partitioning**: Round-robin across partitions within a geo topic for throughput; increase partition count for dense/busy geos.
- **Keys**: Use `orderId` as key for request/response correlation and per-order ordering within a partition.
- **QoS**: At-least-once with idempotent consumers and deduplication by `eventId`.

**Real-Time Flow**:
1. Order service publishes status updates to `order_updates` topic
2. Driver service publishes location updates to `driver_location` topic
3. Kafka consumers process updates and trigger appropriate notifications
4. Push notifications deliver critical updates immediately
5. In-app polling provides real-time status updates every 10-30 seconds
6. Email/SMS for order confirmations and non-critical updates

## Communication Patterns

### Synchronous Communication
- REST APIs for CRUD operations
- Direct service-to-service calls for simple operations

### Asynchronous Communication
- Message queues for ETA calculations
- Event streaming for real-time updates
- Async processing for non-critical operations

### Orders Service ↔ Driver Assignment Service (Kafka)

**Motivation**:
- Decouple order placement/payment from driver selection to handle high concurrency and align pickup time with kitchen readiness.

**Flow**:
1. Payment Completed → Orders Service publishes `AssignmentRequested` to `driver_assignment.requests.{geo}`.
2. Driver Assignment Service consumes, computes priority and selects driver considering prep time and travel times.
3. On success, publishes `DriverAssigned` to `driver_assignment.events.{geo}`; on failure/timeout, publishes `AssignmentFailed` with reason and retry-after.
4. Orders Service consumes events to update order state and notify customer/restaurant.

**Prioritization Logic**:
- Ordering key: remaining time to ready for pickup (sooner → higher priority).
- Factors: `prepTimeRemaining`, `driverToRestaurantETA`, `restaurantToCustomerETA`.
- Objective: minimize idle wait at restaurant and lateness to customer; prioritize orders with minimal slack: `slack = prepTimeRemaining - driverToRestaurantETA`.

**Scheduling**:
- If `driverToRestaurantETA > prepTimeRemaining`, defer assignment until `prepTimeRemaining ≈ driverToRestaurantETA` using a delayed requeue/backoff.
- Immediate assignment for already-ready or near-ready orders.

**Reliability**:
- At-least-once processing with idempotent updates (`eventId`, `orderVersion`).
- Dead-letter topics: `driver_assignment.requests.dlq.{geo}` and `driver_assignment.events.dlq.{geo}` with exponential backoff.

**Backpressure & Scale**:
- Increase partitions for busy geos; autoscale consumers per geo.
- Use consumer lag metrics to trigger partition and replica scaling.

**Observability**:
- Emit metrics: time-to-assign, slack at pickup, assignment success rate, retries, DLQ counts.

### Technology choice: Kafka vs RabbitMQ

**Why Kafka here**:
- **Throughput and fan-out**: High-volume order/payment and driver/GPS streams with multiple consumers (assignment, notifications, analytics) benefit from Kafka’s partitions, persistence, and consumer groups.
- **Ordering by key**: Per-order/per-geo ordering via partition keys matches our need to keep events ordered for a given order.
- **Replay and audit**: Ability to reprocess assignment events after algorithm changes and to audit outcomes.

**When RabbitMQ would fit**:
- Native broker-side priorities and per-message delay/TTL are simpler when strict priority queues/delays are the main requirement and throughput is modest.

**Design note (delays/priorities)**:
- We implement readiness-aware assignment using a lightweight scheduler per geo (sidecar or library), backed by an in-memory queue or Redis sorted set, and publish to Kafka when `driverETA ≈ prepReadyAt`. This preserves Kafka for streaming and fan-out while keeping delay/priority logic in the service layer.

### Operational Playbook (Driver Assignment Streams)

**Monitoring (per geo and aggregate)**:
- Consumer lag (requests/events), end-to-end time-to-assign (payment → DriverAssigned), event throughput, DLQ rate, rebalance frequency.
- P99 assignment latency, average slack at pickup, assignment success/decline rate, retries.

**Scaling**:
- Scale consumers on sustained lag > 30s or assignment P99 > target (e.g., 5s).
- Increase partitions for geos where peak RPS × processing time exceeds current parallelism.
- Co-locate consumers with brokers by geo where possible to reduce cross-zone traffic.

**Topic configuration**:
- Requests: retention 24-48h (replay window), cleanup.policy=delete.
- Events: retention 7d for audit; optionally compact by `orderId` if only latest matters.
- DLQ: retention 14d; include error cause and retry metadata.

**Partition sizing guideline**:
- Start: light geos 12-24, busy geos 48-96 partitions.
- Rule of thumb: partitions ≥ peak RPS × avg proc time (s) × safety factor (2-3).

**Alerting**:
- Lag > 60s (warning), > 180s (critical).
- DLQ rate > 0.5% (warning), > 2% (critical).
- Assignment P99 > 10s (warning), > 20s (critical).

**Backpressure actions**:
- Autoscale workers; temporarily relax reassignment retries; shed non-critical consumers.
- Throttle upstream request publishing only as last resort.

**Change management**:
- Replay in staging from production topics for algorithm updates.
- Use canary deployment per geo; compare metrics before full rollout.

### Concurrency Control for Driver Assignment

**Goal**: Prevent the same driver from being assigned to two active orders while maintaining high concurrency.

**Approach**:
- **Optimistic Concurrency on `drivers`**: Add `drivers.version` and perform compare-and-set (CAS) during assignment: update `status`/`current_order` only if `version` and `status='available'` still match.
- **Optimistic Concurrency on `orders`**: Maintain `orders.version`; set `driver_id` and status only if the expected `version` matches.
- **Uniqueness Guard**: Partial unique index on `orders(driver_id)` for active statuses (`assigned_driver`, `picked_up`, `out_delivery`). Ensures at most one active order per driver.
- **Transactional Assignment**: In a single DB transaction: (1) CAS driver row; (2) CAS order row; rollback if either fails; then publish `DriverAssigned`.
- **Idempotency**: Include `orderVersion`/`assignmentVersion` with events; consumers ignore stale events.

## Security Architecture

### JWT Authentication
- **Token Management**: Centralized JWT service
- **Authorization**: Service-level authorization middleware
- **Security**: HTTPS, secure token storage, token expiration

### API Security
- Rate limiting
- Input validation
- CORS configuration
- Security headers

## API Gateway & Load Balancing

### API Gateway
**Purpose**: Centralized entry point for all client requests

**Key Responsibilities**:
- **Rate Limiting**: Per-customer and per-endpoint rate limits
- **Authorization**: JWT token validation and routing
- **Routing**: Direct requests to appropriate microservices
- **Request/Response Transformation**: API versioning and format conversion
- **Security**: CORS, security headers, input validation
- **Monitoring**: Request logging and metrics collection

**Rate Limiting Strategy**:
- **Browsing Endpoints**: Higher limits (e.g., 1000 requests/minute)
- **Order Endpoints**: Moderate limits (e.g., 100 requests/minute)
- **Search Endpoints**: Balanced limits (e.g., 500 requests/minute)
- **Per-Customer Tiers**: Different limits based on customer subscription

**Technology Options**:
- **Kong**: Open-source API gateway with rich plugin ecosystem
- **AWS API Gateway**: Managed service with built-in rate limiting
- **Nginx**: Lightweight reverse proxy with rate limiting modules
- **Custom Solution**: Built with Node.js/Express or Python/FastAPI

### Load Balancer
**Purpose**: Distribute traffic across multiple service instances

**Load Balancing Strategy**:
- **Round Robin**: Basic distribution for equal-capacity instances
- **Least Connections**: Route to instance with fewest active connections
- **Weighted Round Robin**: Assign different weights based on instance capacity
- **Health Check Based**: Route only to healthy instances

**Health Checks**:
- **HTTP Endpoints**: `/health` endpoints for each service
- **Database Connectivity**: Verify database connections
- **Dependencies**: Check Redis, Kafka connectivity
- **Response Time**: Monitor service response times

**Technology Options**:
- **HAProxy**: High-performance load balancer
- **Nginx**: Web server with load balancing capabilities
- **AWS ALB/NLB**: Managed load balancing services
- **Kubernetes Ingress**: Native Kubernetes load balancing

## Performance Optimization

### Latency Analysis for Restaurant Menu Endpoint

#### **P99 Response Time Requirement**
- **Target**: P99 response time for fetching a restaurant's menu and current status must be under 200ms
- **Endpoint**: `GET /restaurants/{id}/menu`

#### **Request Flow Analysis**
```
API Gateway → Load Balancer → Restaurant Service → Cache Check → Database Query → Response
```

#### **Latency Components Breakdown**

**1. Network & Infrastructure Latency**
- API Gateway: 5-10ms
- Load Balancer: 2-5ms  
- Service-to-Service: 1-3ms
- **Total Network Overhead**: 8-18ms

**2. Middleware Processing**
- Optional Auth Middleware: 1-2ms (JWT verification if token provided)
- Validation Middleware: 1-3ms (UUID validation)
- **Total Middleware**: 2-5ms

**3. Cache Operations (Redis)**
- Cache Hit: 1-3ms (sub-millisecond Redis + JSON parsing)
- Cache Miss: 1-3ms (cache check only)
- Cache Set: 2-5ms (JSON serialization + Redis write)

**4. Database Operations (PostgreSQL)**
- Connection Pool: 1-2ms (get connection from pool)
- Restaurant Query: 5-15ms (simple SELECT by ID with index)
- Menu Query: 10-30ms (SELECT with WHERE clause, ORDER BY)
- **Total Database**: 16-47ms

**5. Application Processing**
- Data Transformation: 2-5ms (mapping results to response format)
- JSON Serialization: 1-3ms (response serialization)
- **Total Processing**: 3-8ms

#### **Latency Scenarios**

**Scenario 1: Cache Hit (Best Case)**
```
Network: 8-18ms
Middleware: 2-5ms  
Cache Hit: 1-3ms
Processing: 3-8ms
Total: 14-34ms ✅ (Well under 200ms)
```

**Scenario 2: Cache Miss (Normal Case)**
```
Network: 8-18ms
Middleware: 2-5ms
Cache Check: 1-3ms
Database: 16-47ms
Cache Set: 2-5ms
Processing: 3-8ms
Total: 32-86ms ✅ (Well under 200ms)
```

**Scenario 3: Database Under Load (Worst Case)**
```
Network: 8-18ms
Middleware: 2-5ms
Cache Check: 1-3ms
Database: 30-60ms (under load)
Cache Set: 2-5ms
Processing: 3-8ms
Total: 46-99ms ✅ (Still under 200ms)
```

#### **P99 Latency Calculation**

Based on the simplified architecture approach (8.3 QPS), the system is not under heavy load:

- **P50**: ~25-40ms
- **P95**: ~35-60ms  
- **P99**: ~45-80ms ✅ **Well under 200ms requirement**

#### **Performance Optimizations in Place**

1. **Redis Caching**: 2-minute TTL for menu data
2. **Database Indexes**: Primary key indexes on `_id` fields
3. **Connection Pooling**: 20 connections, 2s timeout
4. **Denormalized Data**: Restaurant info embedded in food_items
5. **Efficient Queries**: Simple SELECT with WHERE clauses

#### **Potential Optimizations**

**1. Database Query Performance**
- **Current**: Two separate queries (restaurant + menu)
- **Optimization**: Could combine into single query with JOIN
- **Impact**: Reduce 16-47ms to 10-25ms

**2. Cache Strategy**
- **Current**: 2-minute TTL (good for menu changes)
- **Optimization**: Could implement cache warming for popular restaurants
- **Impact**: Increase cache hit ratio from ~60% to ~80%

**3. JSON Serialization**
- **Current**: Standard JSON.stringify
- **Optimization**: Could use faster serialization libraries
- **Impact**: Reduce 1-3ms to 0.5-1ms

#### **Conclusion**

**✅ The current architecture comfortably meets the P99 < 200ms requirement**

- **Expected P99 latency**: 45-80ms
- **Safety margin**: 120-155ms buffer
- **Cache hit scenario**: 14-34ms
- **Cache miss scenario**: 32-86ms

The simplified architecture approach with realistic load expectations (1.7-3.3 QPS steady, 8.3 QPS peak) ensures excellent performance. The Redis caching strategy with 2-minute TTL provides good balance between performance and data freshness for menu data.

### Latency Analysis for Order Processing Endpoint

#### **P99 Response Time Requirement**
- **Target**: P99 response time for order placement and processing must be under 500ms
- **Endpoint**: `POST /orders`
- **Critical Path**: Order creation → Payment processing → Driver assignment request

#### **Request Flow Analysis**
```
API Gateway → Load Balancer → Auth Service → Orders Service → Database Transaction → Kafka Event → Response
                                    ↓
                              Payment Processing (Mocked)
                                    ↓
                              Order Status Update
                                    ↓
                              Driver Assignment Request (Kafka)
```

#### **Latency Components Breakdown**

**1. Network & Infrastructure Latency**
- API Gateway: 5-10ms
- Load Balancer: 2-5ms  
- Service-to-Service: 1-3ms
- **Total Network Overhead**: 8-18ms

**2. Authentication & Authorization**
- JWT Token Validation: 2-5ms
- User Permission Check: 1-3ms
- **Total Auth**: 3-8ms

**3. Order Validation & Business Logic**
- Input Validation: 1-2ms
- Business Rule Validation: 2-5ms
- Inventory Check: 5-15ms (with optimistic locking)
- **Total Validation**: 8-22ms

**4. Database Operations (PostgreSQL)**
- Connection Pool: 1-2ms (get connection from pool)
- Order Creation Transaction: 10-25ms (INSERT with constraints)
- Inventory Update: 5-15ms (optimistic locking with retry)
- **Total Database**: 16-42ms

**5. Payment Processing (Mocked)**
- Payment Gateway Call: 50-150ms (external service)
- Payment Validation: 5-10ms
- **Total Payment**: 55-160ms

**6. Kafka Event Publishing**
- Order Created Event: 5-15ms
- Driver Assignment Request: 5-15ms
- **Total Kafka**: 10-30ms

**7. Application Processing**
- Data Transformation: 2-5ms
- Response Serialization: 1-3ms
- **Total Processing**: 3-8ms

#### **Latency Scenarios**

**Scenario 1: Normal Order Processing (Best Case)**
```
Network: 8-18ms
Auth: 3-8ms
Validation: 8-22ms
Database: 16-42ms
Payment: 55-160ms
Kafka: 10-30ms
Processing: 3-8ms
Total: 103-288ms ✅ (Well under 500ms)
```

**Scenario 2: High Inventory Contention (Normal Case)**
```
Network: 8-18ms
Auth: 3-8ms
Validation: 8-22ms
Database: 20-50ms (with retry)
Payment: 55-160ms
Kafka: 10-30ms
Processing: 3-8ms
Total: 107-296ms ✅ (Well under 500ms)
```

**Scenario 3: Payment Gateway Slow (Worst Case)**
```
Network: 8-18ms
Auth: 3-8ms
Validation: 8-22ms
Database: 16-42ms
Payment: 100-200ms (slow gateway)
Kafka: 10-30ms
Processing: 3-8ms
Total: 148-328ms ✅ (Still under 500ms)
```

#### **P99 Latency Calculation**

Based on the simplified architecture approach (8.3 QPS), the system is not under heavy load:

- **P50**: ~150-200ms
- **P95**: ~200-300ms  
- **P99**: ~250-350ms ✅ **Well under 500ms requirement**

#### **Performance Optimizations in Place**

1. **Optimistic Locking**: Prevents blocking during inventory updates
2. **Connection Pooling**: 20 connections, 2s timeout
3. **Asynchronous Driver Assignment**: Non-blocking Kafka event
4. **Database Indexes**: Primary key and foreign key indexes
5. **Transaction Optimization**: Minimal transaction scope

#### **Potential Optimizations**

**1. Payment Processing**
- **Current**: Synchronous payment processing
- **Optimization**: Asynchronous payment with webhook confirmation
- **Impact**: Reduce 55-160ms to 5-15ms (immediate response)

**2. Database Optimization**
- **Current**: Separate inventory update with retry
- **Optimization**: Single transaction with atomic inventory update
- **Impact**: Reduce 16-42ms to 10-25ms

**3. Caching Strategy**
- **Current**: No caching for order processing
- **Optimization**: Cache user preferences and restaurant data
- **Impact**: Reduce validation time from 8-22ms to 3-8ms

#### **Error Handling & Retry Logic**

**1. Inventory Conflicts**
- **Retry Strategy**: Exponential backoff (3 attempts)
- **Fallback**: Return "item unavailable" error
- **Impact**: Adds 10-30ms for retries

**2. Payment Failures**
- **Retry Strategy**: 2 attempts with different payment methods
- **Fallback**: Return payment error to user
- **Impact**: Adds 50-150ms for retry

**3. Database Deadlocks**
- **Retry Strategy**: Immediate retry (3 attempts)
- **Fallback**: Return "service temporarily unavailable"
- **Impact**: Adds 5-15ms for retry

#### **Conclusion**

**✅ The current architecture comfortably meets the P99 < 500ms requirement**

- **Expected P99 latency**: 250-350ms
- **Safety margin**: 150-250ms buffer
- **Normal scenario**: 103-288ms
- **Worst case scenario**: 148-328ms

The order processing flow is optimized for the simplified architecture approach. The main latency contributor is payment processing (55-160ms), which is acceptable for a food delivery platform. The asynchronous driver assignment ensures the order creation response is not blocked by driver availability.

### Throughput Analysis for 500 Orders per Minute

#### **Target Throughput Requirement**
- **Steady State**: 100-200 orders per minute = 1.7-3.3 orders per second (QPS)
- **Peak Load**: 500 orders per minute = 8.3 orders per second (QPS) during rush hours
- **Burst Load**: 2,000 orders per minute = 33.3 orders per second during special events
- **SLA**: 99.9% success rate for order processing

#### **System Capacity Analysis**

**1. Orders Service Capacity**
- **Service Instances**: 3-10 instances (write-heavy, transaction-critical)
- **Per Instance Capacity**: 5-15 orders/second (depending on instance size)
- **Total Capacity**: 15-150 orders/second ✅ **Exceeds 8.3 QPS peak requirement**
- **Safety Margin**: 2-18x capacity buffer for peak loads

**Capacity Calculation Breakdown:**

**Per Instance Capacity Factors:**

**Conservative Estimate (5 orders/second):**
- Database Write: ~200ms per order (including transaction overhead)
- Payment Processing: ~150ms (external dependency)
- Kafka Publishing: ~50ms (event publishing)
- Total per order: ~400ms
- Capacity: 1 second ÷ 0.4 seconds = 2.5 orders/second
- With overhead: ~5 orders/second

**Optimistic Estimate (15 orders/second):**
- Database Write: ~100ms per order (optimized queries)
- Payment Processing: ~100ms (fast payment gateway)
- Kafka Publishing: ~20ms (efficient event publishing)
- Total per order: ~220ms
- Capacity: 1 second ÷ 0.22 seconds = 4.5 orders/second
- With parallel processing: ~15 orders/second

**Total Capacity Calculation:**
- Conservative: 3 instances × 5 orders/second = 15 orders/second
- Optimistic: 10 instances × 15 orders/second = 150 orders/second

**Key Assumptions:**
- Database Performance: PostgreSQL handles 50-100 orders/second with proper indexing
- Payment Gateway: External service with 100-150ms response time
- Kafka Publishing: Sub-50ms for event publishing (Orders ↔ Driver Assignment communication)
- Instance Resources: Adequate CPU/memory for the workload
- Connection Pooling: Properly sized database connection pools

**Reality Check for 8.3 QPS Peak:**
- Conservative: 15 orders/second ✅ (1.8x buffer)
- Optimistic: 150 orders/second ✅ (18x buffer)

**2. Database Throughput (PostgreSQL)**
- **Write Throughput**: 200-800 writes/second (orders + status updates)
- **Order Creation**: ~50-100 orders/second (with inventory updates)
- **Status Updates**: ~150-700 updates/second (6-8 updates per order)
- **Total Database Load**: 200-800 writes/second ✅ **Sufficient for 8.3 QPS peak**

**3. Kafka Event Processing**
- **Order Created Events**: 1.7-8.3 events/second (steady to peak)
- **Driver Assignment Requests**: 1.7-8.3 requests/second (steady to peak)
- **Status Update Events**: 10-67 events/second (6-8 per order)
- **Driver Location Events**: 2,000 events/second (peak GPS stream)
- **Total Kafka Load**: ~2,013-2,084 events/second
- **Kafka Capacity**: 10,000+ events/second ✅ **Well within capacity**

**4. Redis Cache Performance**
- **Cache Operations**: 100-500 operations/second
- **Cache Hit Ratio**: 80% for restaurant data
- **Cache Miss Impact**: Minimal (2-5ms per miss)
- **Redis Capacity**: 10,000+ operations/second ✅ **Sufficient capacity**

#### **Bottleneck Analysis**

**1. Database Connection Pool**
- **Current**: 50-100 connections per service
- **Orders Service**: 3-10 instances × 50-100 connections = 150-1,000 connections
- **Connection Utilization**: ~20-30% at peak load
- **Bottleneck Risk**: Low ✅

**2. Payment Processing (External Dependency)**
- **Payment Gateway**: 50-150ms per transaction
- **Concurrent Payments**: 1.7-8.3 payments/second (steady to peak)
- **Payment Gateway Capacity**: Typically 100-1,000 TPS
- **Bottleneck Risk**: Low ✅ (External service handles load)

**3. Inventory Management**
- **Optimistic Locking**: Prevents blocking
- **Retry Logic**: 3 attempts with exponential backoff
- **Conflict Rate**: Expected <5% for popular items
- **Bottleneck Risk**: Low ✅

**4. Driver Assignment Processing**
- **Assignment Algorithm**: 10-50ms per assignment
- **Concurrent Assignments**: 1.7-8.3 assignments/second (steady to peak)
- **Driver Pool**: 4M drivers, ~40K active at peak
- **Bottleneck Risk**: Low ✅

#### **Load Testing Scenarios**

**Scenario 1: Steady State (100-200 orders/minute)**
```
Orders Service: 1.7-3.3 QPS
Database: 10-20 writes/second
Kafka: 13-26 events/second
Payment: 1.7-3.3 payments/second
Result: ✅ System handles load comfortably
```

**Scenario 2: Peak Load (500 orders/minute)**
```
Orders Service: 8.3 QPS
Database: 42-83 writes/second
Kafka: 67-330 events/second
Payment: 8.3 payments/second
Result: ✅ System handles peak load with buffer
```

**Scenario 3: Burst Load (2,000 orders/minute for 5 minutes)**
```
Orders Service: 33.3 QPS
Database: 167-333 writes/second
Kafka: 267-1,320 events/second
Payment: 33.3 payments/second
Result: ⚠️ May require auto-scaling, but manageable
```

#### **Auto-Scaling Triggers**

**Orders Service Auto-Scaling**
- **CPU Threshold**: 70% average CPU utilization
- **Memory Threshold**: 80% memory utilization
- **Response Time**: P99 > 500ms
- **Error Rate**: >1% error rate
- **Scale Up**: Add 2-3 instances when triggered
- **Scale Down**: Remove 1 instance when load decreases

**Database Scaling**
- **Connection Pool**: Increase pool size if connection wait time >100ms
- **Read Replicas**: Add replicas if read latency >50ms
- **Write Performance**: Monitor write queue depth and commit latency

**Kafka Scaling**
- **Consumer Lag**: Scale consumers if lag >30 seconds
- **Partition Count**: Increase partitions if throughput per partition >1,000 events/second
- **Broker Scaling**: Add brokers if disk I/O >80%

#### **Performance Monitoring KPIs**

**Throughput Metrics**
- Orders per second (target: 1.7-3.3 QPS steady, 8.3 QPS peak)
- Database writes per second (target: <800 writes/second)
- Kafka events per second (target: <1,000 events/second)
- Payment success rate (target: >99%)

**Latency Metrics**
- Order creation latency (target: P99 <500ms)
- Database write latency (target: P99 <100ms)
- Kafka publish latency (target: P99 <50ms)
- Payment processing latency (target: P99 <200ms)

**Error Metrics**
- Order creation error rate (target: <1%)
- Database error rate (target: <0.1%)
- Kafka error rate (target: <0.1%)
- Payment failure rate (target: <5%)

#### **Capacity Planning Recommendations**

**1. Immediate Deployment (Steady State)**
- Orders Service: 2 instances (minimum)
- Database: 1 primary + 1 read replica
- Kafka: 3 brokers
- Redis: 1 instance (10-50 GB)
- **Total Capacity**: 10-30 orders/second ✅

**2. Peak Load Preparation (8.3 QPS)**
- Orders Service: 3-5 instances
- Database: 1 primary + 2 read replicas
- Kafka: 5 brokers
- Redis: 1-2 instances (20-100 GB)
- **Total Capacity**: 15-75 orders/second ✅

**3. Burst Load Handling (33.3 QPS)**
- Orders Service: 8-12 instances (auto-scaled)
- Database: 1 primary + 3-4 read replicas
- Kafka: 8-10 brokers
- Redis: 2-3 instances (50-150 GB)
- **Total Capacity**: 40-180 orders/second ✅

#### **Conclusion**

**✅ The system architecture can comfortably handle 500 orders per minute (8.3 QPS) peak load**

**Key Strengths:**
- **2-18x capacity buffer** for peak loads
- **Auto-scaling capabilities** for burst traffic
- **Asynchronous processing** prevents blocking
- **Optimistic locking** maintains high concurrency
- **Distributed architecture** allows independent scaling

**Monitoring Focus:**
- Database connection pool utilization
- Payment gateway response times
- Kafka consumer lag
- Orders service CPU/memory usage

**Scaling Strategy:**
- Start with 2 Orders Service instances for steady state
- Scale to 3-5 instances for peak load (8.3 QPS)
- Monitor and auto-scale based on metrics
- Scale database read replicas as needed
- Increase Kafka partitions for busy geos

The simplified architecture approach provides excellent throughput capabilities while maintaining the flexibility to scale 10-20x for future growth.

### Driver Location Update Analysis

#### **Real-Time GPS Stream Requirements**
- **Concurrent Drivers**: 10,000 active drivers
- **Update Frequency**: Every 5 seconds per driver
- **Peak Throughput**: 2,000 GPS events/second
- **Data Volume**: 400 KB/second, 24 MB/minute, 1.4 GB/hour
- **Latency Target**: P99 < 100ms for location ingestion, P99 < 200ms for customer display

#### **GPS Data Flow Architecture**
```
Driver App → GPS Service → Kafka Topic → Location Processor → Redis Cache → Customer App
     ↓              ↓              ↓              ↓              ↓              ↓
GPS Update    Location API    driver_location    Real-time    Live Cache    Live Map
Every 5s      Validation      topic (2K/sec)     Processing    Updates       Display
```

#### **System Components for GPS Stream**

**1. GPS Ingestion Service**
- **Purpose**: Handle high-volume GPS updates from driver mobile apps
- **Capacity**: 2,000+ events/second with auto-scaling
- **Validation**: GPS coordinate validation, driver authentication
- **Rate Limiting**: Per-driver rate limiting (max 1 update per 3 seconds)
- **Technology**: Node.js with WebSocket/HTTP endpoints

**GPS Service Instance Calculation:**
- **Target Load**: 2,000 GPS events/second (from 10,000 drivers × 1 update per 5 seconds)
- **Per Instance Capacity**: 200-400 events/second
- **Processing Time per Event**: 10-25ms (validation + auth + publishing)
- **Capacity Math**: 1 second ÷ 25ms = 40 events/second (conservative)
- **With Parallel Processing**: 200-400 events/second per instance
- **Total Capacity**: 5 instances × 200 events/second = 1,000 events/second (minimum)
- **Total Capacity**: 10 instances × 400 events/second = 4,000 events/second (maximum)
- **Safety Factor**: 2-10x buffer for peak loads and processing variations

**2. Kafka GPS Topic Strategy**
- **Topic**: `driver_location` with 50-100 partitions for 2,000 events/second
- **Partitioning**: Hash by `driver_id` to maintain order per driver
- **Retention**: 24 hours for real-time processing, 7 days for analytics
- **Replication**: 3x replication for reliability

**3. Real-Time Location Processor**
- **Purpose**: Process GPS events and update live location cache
- **Capacity**: 2,000+ events/second processing
- **Functions**: 
  - Update Redis with latest driver location
  - Calculate ETA adjustments based on movement
  - Trigger notifications for significant location changes
  - Aggregate location data for analytics

**Location Service Worker Calculation:**
- **Target Load**: 2,000 GPS events/second (same as GPS Service)
- **Per Worker Capacity**: 100-200 events/second
- **Processing Time per Event**: 5-13ms (consumption + cache + processing)
- **Capacity Math**: 1 second ÷ 13ms = 77 events/second (conservative)
- **With Optimization**: 100-200 events/second per worker
- **Total Capacity**: 10 workers × 100 events/second = 1,000 events/second (minimum)
- **Total Capacity**: 20 workers × 200 events/second = 4,000 events/second (maximum)
- **Safety Factor**: 2-4x buffer for processing variations

**4. Redis Location Cache**
- **Purpose**: Store live driver locations for real-time customer access
- **Data Structure**: Hash maps with driver_id as key
- **TTL**: 30 seconds (auto-expire stale locations)
- **Capacity**: 10,000+ concurrent driver locations
- **Memory**: ~2 MB for 10,000 drivers (200 bytes each)

#### **Performance Analysis for GPS Stream**

**1. GPS Ingestion Capacity**
- **Service Instances**: 5-10 instances for 2,000 events/second
- **Per Instance Capacity**: 200-400 events/second
- **Processing Breakdown per Event**:
  - Coordinate validation: 1-2ms
  - Driver authentication: 2-3ms
  - Rate limiting check: 1ms
  - Data enrichment: 1-2ms
  - Kafka publishing: 5-15ms
  - **Total per event**: 10-25ms
- **Network Bandwidth**: 400 KB/second (minimal impact)
- **Total Latency**: 5-20ms for GPS ingestion ✅

**2. Kafka GPS Topic Performance**
- **Partitions**: 50-100 partitions for 2,000 events/second
- **Events per Partition**: 20-40 events/second (well within capacity)
- **Producer Latency**: 1-5ms per event
- **Consumer Lag**: Target < 1 second for real-time processing
- **Storage**: 1.4 GB/hour, 34 GB/day (manageable with retention)

**3. Location Processing Performance**
- **Processing Workers**: 10-20 workers for 2,000 events/second
- **Per Worker Capacity**: 100-200 events/second
- **Processing Breakdown per Event**:
  - Kafka consumption: 1-3ms
  - Redis cache update: 1-3ms
  - ETA recalculation trigger: 2-5ms
  - Analytics aggregation: 1-2ms
  - **Total per event**: 5-13ms
- **Total Processing Time**: 5-15ms per GPS event ✅

**4. Customer-Facing Location Access**
- **Cache Hit Latency**: 1-3ms (Redis in-memory)
- **API Response Time**: 5-10ms for location retrieval
- **WebSocket Updates**: Real-time push notifications
- **Total Customer Latency**: 6-13ms ✅ **Well under 200ms target**

#### **GPS Data Storage Strategy**

**1. Real-Time Storage (Redis)**
- **Driver Locations**: Hash map with driver_id as key
- **Data Structure**: `{lat, lng, timestamp, order_id, status}`
- **TTL**: 30 seconds (auto-cleanup)
- **Memory Usage**: ~2 MB for 10,000 drivers

**2. Historical Storage (PostgreSQL)**
- **Location History**: Store GPS points for completed orders
- **Table**: `driver_location_history` with time-based partitioning
- **Retention**: 90 days for order tracking, archive older data
- **Storage**: ~1.4 GB/hour, 34 GB/day (manageable)

**3. Analytics Storage (S3/Parquet)**
- **Aggregated Data**: Hourly/daily driver movement patterns
- **Use Cases**: Route optimization, driver behavior analysis
- **Storage**: Compressed Parquet files for cost efficiency

#### **Real-Time Customer Experience**

**1. Live Driver Tracking**
- **Update Frequency**: Every 5 seconds (driver) → Every 10 seconds (customer)
- **Display Latency**: < 200ms from GPS update to customer screen
- **Smooth Animation**: Interpolated movement between GPS points
- **Offline Handling**: Graceful degradation when GPS unavailable

**2. ETA Updates**
- **Dynamic ETA**: Recalculate based on real-time driver movement
- **Update Triggers**: Significant location changes (>100m), traffic updates
- **Customer Notifications**: Push notifications for ETA changes >5 minutes

**3. Privacy & Security**
- **Driver Consent**: Opt-in for location sharing during active orders
- **Data Minimization**: Only share location during active deliveries
- **Encryption**: GPS data encrypted in transit and at rest
- **Retention**: Location data deleted after order completion

#### **Scaling Considerations**

**1. Auto-Scaling Triggers**
- **GPS Ingestion**: Scale when latency > 50ms or error rate > 1%
- **Location Processing**: Scale when consumer lag > 5 seconds
- **Customer Load**: Scale when location API latency > 100ms

**2. Geographic Distribution**
- **Regional Clusters**: Deploy GPS services close to driver concentrations
- **Edge Caching**: CDN for static map assets
- **Load Balancing**: Route GPS updates to nearest processing cluster

**3. Fault Tolerance**
- **GPS Service**: Multiple instances with health checks
- **Kafka**: 3x replication for message durability
- **Redis**: Redis Cluster for high availability
- **Fallback**: Graceful degradation to polling-based updates

#### **Monitoring & Observability**

**1. GPS Stream Metrics**
- **Throughput**: GPS events per second (target: 2,000)
- **Latency**: GPS ingestion to customer display (target: < 200ms)
- **Error Rate**: Failed GPS updates (target: < 0.1%)
- **Consumer Lag**: Location processing delay (target: < 1 second)

**2. Customer Experience Metrics**
- **Location Accuracy**: GPS precision and update frequency
- **Display Latency**: Time from GPS update to customer screen
- **Smoothness**: Interpolation quality and animation performance
- **Availability**: Uptime for live tracking feature

**3. Operational Metrics**
- **Driver Coverage**: Percentage of active drivers with GPS enabled
- **Data Quality**: GPS accuracy and signal strength
- **Storage Growth**: Historical location data volume
- **Cost Analysis**: GPS processing and storage costs

#### **Conclusion**

**✅ The architecture can handle 10,000 concurrent drivers with 2,000 GPS events/second**

**Key Strengths:**
- **High Throughput**: Kafka handles 2,000+ events/second easily
- **Low Latency**: End-to-end latency < 200ms for customer display
- **Real-time Processing**: Live location updates every 5 seconds
- **Scalable Design**: Auto-scaling for peak loads and geographic distribution
- **Cost Effective**: Efficient storage and processing strategies

**Capacity Verification:**
- **GPS Service**: 5-10 instances provide 1,000-4,000 events/second capacity ✅
- **Location Service**: 10-20 workers provide 1,000-4,000 events/second capacity ✅
- **Safety Margin**: 2-4x buffer for peak loads and processing variations ✅
- **Processing Assumptions**: Conservative estimates with room for optimization

**Implementation Priority:**
1. **Phase 1**: Basic GPS ingestion with Kafka and Redis
2. **Phase 2**: Real-time customer tracking with WebSocket updates
3. **Phase 3**: Advanced analytics and route optimization
4. **Phase 4**: Machine learning for predictive ETA updates

### Multi-Layer Caching Strategy

#### **1. CDN Layer (Static Content)**
- **Purpose**: Serve static assets globally with low latency
- **Content**: Restaurant images, food item pictures, CSS, JavaScript
- **Technology**: CloudFront, Cloudflare, or similar CDN service
- **Cache Strategy**: Long TTL for images, shorter for CSS/JS

#### **2. Application Cache (Redis)**
- **Purpose**: Cache frequently accessed data in memory
- **Content**: Restaurant data, menu information, search results
- **Cache Strategy**: Cache-aside pattern with TTL-based expiration
- **Key Patterns**: Location-based keys, cuisine-based keys

#### **3. Database Cache**
- **Purpose**: Cache query results and reduce database load
- **Content**: Complex search queries, location-based results
- **Cache Strategy**: Query result caching with invalidation on updates
- **Technology**: PostgreSQL query result cache, Redis for complex queries

#### **4. Browser Cache**
- **Purpose**: Reduce server requests for static content
- **Content**: API responses, images, CSS, JavaScript
- **Cache Strategy**: HTTP caching headers with appropriate TTLs

### Cache-Aside Pattern Implementation
- **Cache-First Strategy**: Check cache before database queries
- **Cache Miss Handling**: Fetch from database and populate cache
- **TTL Management**: Appropriate expiration times for different data types
- **Performance**: Eliminates database round trips for frequently accessed data

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### Write-Through Cache for Real-Time Updates
- **Database-First Updates**: Update database before cache operations
- **Cache Invalidation**: Remove related cached data immediately
- **Event Publishing**: Trigger real-time notifications via Kafka
- **Consistency**: Ensures data consistency across cache and database

*Note: Complete implementation details are available in IMPLEMENTATION.md*

### Search Service Architecture

#### **Dedicated Search Service**
**Purpose**: Handle complex search queries and provide unified search interface

**Responsibilities**:
- **Unified Search**: Search across restaurants and food items simultaneously
- **Complex Queries**: Handle multi-criteria searches (location + cuisine + price + dietary)
- **Result Aggregation**: Combine and rank results from multiple sources
- **Search Analytics**: Track search patterns and optimize results

**Technology Stack**:
- **Phase 1**: PostgreSQL GIN indexes with custom search logic
- **Phase 2**: Elasticsearch for advanced search capabilities
- **Caching**: Redis for search result caching with location-based keys

#### **Search Strategy: Hybrid Approach**

**Phase 1: PostgreSQL GIN Indexes (Immediate Implementation)**
- **Restaurant Names**: Full-text search using GIN indexes with alias support
- **Food Items**: Combined name and description search with common variations
- **JSON Tags**: Flexible tag-based filtering
- **Alias Support**: Common misspellings and alternative pronunciations
- **Performance**: Optimized for fast text search

**Alias-based Search Implementation**:
- **Common Misspellings**: "pizza" → "piza", "piza", "pizzah"
- **Alternative Spellings**: "kebab" → "kabob", "kebob", "kabab"
- **Pronunciation Variations**: "sushi" → "susi", "susi", "sushi"
- **Regional Variations**: "curry" → "curri", "curri", "curry"
- **Search Synonyms**: "burger" → "hamburger", "sandwich", "patty"

*Note: Complete implementation details are available in IMPLEMENTATION.md*

**Search Query Examples**:
- **Restaurant Search**: Full-text search with cuisine filtering and ranking
- **Food Item Search**: Type-based search with location and availability filtering
- **Performance**: Optimized queries using GIN indexes and spatial functions

*Note: Complete implementation details are available in IMPLEMENTATION.md*

**Phase 2: Elasticsearch Integration (Future Enhancement)**
- **Advanced Text Search**: Fuzzy matching, synonyms, autocomplete
- **Relevance Scoring**: ML-based result ranking
- **Aggregation**: Faceted search with counts
- **Analytics**: Search trend analysis and optimization

#### **Search Result Caching Strategy**

**Location-Based Cache Keys**:
- **Pattern**: `search:${latitude}:${longitude}:${radius}:${cuisine}:${query}`
- **Examples**: Location-specific cache keys for efficient invalidation
- **Strategy**: Geographic-based cache management

*Note: Complete implementation details are available in IMPLEMENTATION.md*

**Cache Invalidation Strategy**:
- **Restaurant Updates**: Invalidate all location-based caches for that area
- **Menu Changes**: Invalidate food item search caches
- **TTL-Based Expiration**: Cache results for 15-30 minutes
- **Geographic Invalidation**: Invalidate caches within affected radius
- **Availability Changes**: Real-time cache updates via Kafka notifications
- **Scheduled Polling**: Regular availability checks during peak hours (10 AM - 9 PM)

**Enhanced Cache Management Workflow**:
- **Real-time Updates**: Restaurant service pushes availability changes to Kafka
- **Search Service Consumption**: Kafka consumer processes availability updates
- **Immediate Invalidation**: Affected search caches are immediately invalidated
- **Scheduled Refresh**: 5-minute polling during business hours for availability sync
- **Fallback Handling**: Cache refresh on service restart or connection issues

#### **Search Service API Endpoints**
- **POST /search/restaurants**: Location-based restaurant search with cuisine and dietary filtering
- **POST /search/food-items**: Food item type search with price and availability filtering
- **POST /search/unified**: Combined search with smart ranking and deduplication

*Note: Complete implementation details are available in IMPLEMENTATION.md*

## Enhanced Search Service Architecture

### **Real-time Cache Management Workflow**

The Search Service implements an advanced caching strategy that combines TTL-based expiration with real-time availability updates to ensure search results are always current and accurate.

#### **1. Kafka-based Availability Updates**
- **Restaurant Service Publisher**: Pushes availability changes to Kafka topics
- **Search Service Consumer**: Processes availability updates in real-time
- **Immediate Cache Invalidation**: Affected search caches are immediately cleared
- **Geographic Targeting**: Only invalidates caches within affected geographic areas

#### **2. Scheduled Availability Polling**
- **Peak Hours Monitoring**: 5-minute polling during business hours (10 AM - 9 PM)
- **Restaurant Service Integration**: Direct API calls to check restaurant availability
- **Cache Refresh**: Updates search caches with current availability information
- **Fallback Mechanism**: Ensures cache consistency even if Kafka is unavailable

#### **3. Read Replica Strategy**
- **Dedicated Search Replicas**: Separate read replicas for search operations
- **Load Distribution**: Search queries distributed across multiple replica instances
- **Geographic Partitioning**: Location-based query routing to optimize performance
- **Failover Handling**: Automatic failover to healthy replicas

### **Alias-based Search Implementation**

#### **Phase 1: PostgreSQL GIN with Aliases**
- **Common Misspellings**: Handles user typos and common spelling errors
- **Alternative Spellings**: Supports regional and cultural variations
- **Pronunciation Variations**: Catches phonetic similarities
- **Search Synonyms**: Maps related terms to improve search results

#### **Phase 2: Elasticsearch Integration**
- **Fuzzy Matching**: Advanced fuzzy search capabilities
- **Synonym Management**: Comprehensive synonym handling
- **Autocomplete**: Real-time search suggestions
- **Relevance Scoring**: ML-based result ranking

## Scalability Considerations

### Horizontal Scaling
- Service instances can be scaled independently
- Database read replicas for read-heavy operations
- Load balancers for traffic distribution

### Vertical Scaling
- Database connection pooling
- Memory optimization for caching
- CPU optimization for ETA calculations

## Monitoring and Observability

### Metrics
- Response times (P99 < 200ms target)
- Throughput (500 orders/minute target)
- Error rates and availability

### Logging
- Structured logging across all services
- Centralized log aggregation
- Request tracing for debugging

### Health Checks
- Service health endpoints
- Database connectivity monitoring
- Message queue health monitoring

## Deployment Strategy

### Containerization
- Docker containers for all services
- Kubernetes for orchestration
- Service mesh for inter-service communication

### CI/CD Pipeline
- Automated testing
- Blue-green deployments
- Rollback capabilities

## Technology Justification

### Why These Technologies Were Chosen

This section explains the rationale behind each major technology choice and how it addresses the specific requirements of the Swift Eats food delivery platform.

#### **1. PostgreSQL with PostGIS Extension**

**Why PostgreSQL?**
- **ACID Compliance**: Critical for order processing where data consistency is non-negotiable
- **JSONB Support**: Perfect for flexible restaurant and food item data that may have varying attributes
- **Geospatial Capabilities**: PostGIS extension provides enterprise-grade location-based querying
- **Full-Text Search**: Built-in GIN indexes for efficient text search without external dependencies
- **Mature Ecosystem**: Extensive tooling, monitoring, and optimization options

**Why Not Alternatives?**
- **MongoDB**: Lacks ACID compliance needed for order processing
- **MySQL**: Limited geospatial and JSON support compared to PostgreSQL
- **Redis**: Not suitable as primary database for complex relational data

**How It Addresses Requirements:**
- **500 orders/minute**: ACID transactions ensure order integrity under high load
- **P99 < 200ms**: Optimized indexes and query planner for fast response times
- **Location-based queries**: PostGIS spatial indexes for efficient proximity searches

#### **2. Redis for Caching and Session Management**

**Why Redis?**
- **In-Memory Performance**: Sub-millisecond response times for cached data
- **Data Structures**: Rich set of data types (strings, hashes, sets, sorted sets)
- **Persistence Options**: Can persist data to disk for reliability
- **Pub/Sub**: Built-in messaging for real-time updates
- **Clustering**: Horizontal scaling across multiple nodes

**Why Not Alternatives?**
- **Memcached**: Lacks Redis's rich data structures and persistence
- **Hazelcast**: Overkill for simple caching needs
- **In-Memory Database**: Would add unnecessary complexity

**How It Addresses Requirements:**
- **P99 < 200ms**: Cached restaurant data eliminates database round trips
- **High Traffic**: In-memory storage handles thousands of concurrent requests
- **Real-time Updates**: Pub/Sub for immediate cache invalidation

#### **3. Apache Kafka for Event Streaming**

**Why Kafka?**
- **High Throughput**: Can handle 2,000 GPS events/second with ease
- **Message Ordering**: Critical for order status updates and driver tracking
- **Persistence**: Messages stored on disk for reliability and replay
- **Partitioning**: Parallel processing for high-volume data streams
- **Consumer Groups**: Multiple consumers can process the same data

**Why Not Alternatives?**
- **Redis Pub/Sub**: No persistence, messages lost if consumer is down
- **RabbitMQ**: Lower throughput for high-volume streaming
- **AWS SQS**: Limited ordering and partitioning capabilities

**How It Addresses Requirements:**
- **10,000 drivers × 5 seconds**: Kafka's high throughput handles GPS streaming
- **Real-time Updates**: Persistent message storage ensures no updates are lost
- **Order Processing**: Message ordering maintains business logic integrity

#### **4. Microservices Architecture**

**Why Microservices?**
- **Independent Scaling**: Restaurant browsing (read-heavy) vs. order processing (write-heavy)
- **Fault Isolation**: Failure in one service doesn't cascade to others
- **Technology Diversity**: Each service can use optimal technology for its use case
- **Team Autonomy**: Different teams can develop and deploy independently
- **Performance Optimization**: Each service optimized for its specific workload

**Why Not Alternatives?**
- **Monolithic**: Would be difficult to scale different components independently
- **Event-Driven**: Adds complexity without clear benefits for this use case
- **Serverless**: Cold start latency would impact P99 response times

**How It Addresses Requirements:**
- **500 orders/minute**: Orders service can scale independently
- **P99 < 200ms**: Restaurant service optimized for browsing performance
- **Real-time GPS**: Tracking service handles high-volume location updates

#### **5. Node.js/Express for Backend Services**

**Why Node.js?**
- **Event-Driven**: Perfect for I/O-heavy operations (database, Redis, Kafka)
- **Non-blocking I/O**: Handles thousands of concurrent connections efficiently
- **JavaScript Ecosystem**: Rich library ecosystem for web development
- **Performance**: Excellent for JSON-heavy APIs and real-time applications
- **Developer Productivity**: Fast development and deployment cycles

**Why Not Alternatives?**
- **Python**: Slower for I/O operations, GIL limitations
- **Java**: Higher memory overhead, slower startup times
- **Go**: Smaller ecosystem, less mature for web development

**How It Addresses Requirements:**
- **High Concurrency**: Event loop handles thousands of simultaneous requests
- **Real-time APIs**: Kafka integration for event processing
- **JSON Processing**: Native JSON support for API responses

#### **6. Push Notifications and In-App Alerts for Real-Time Communication**

**Why Push Notifications?**
- **Efficient Delivery**: No need to maintain persistent connections
- **Battery Efficient**: Better for mobile devices than constant polling
- **Scalable**: Can handle millions of users without connection overhead
- **Cross-Platform**: Works on both mobile and web applications
- **Real-time Updates**: Immediate delivery of order status and driver location

**Why Not Alternatives?**
- **WebSockets**: Require persistent connections, higher server resources
- **Server-Sent Events**: One-way only, limited browser support
- **Long Polling**: Higher latency and server resource usage

**How It Addresses Requirements:**
- **Real-time Tracking**: Immediate driver location updates via push notifications
- **Order Updates**: Instant notification of status changes
- **Low Latency**: Sub-second update delivery for better user experience

#### **7. ETA Service for Delivery Time Prediction**

**Why ETA Service?**
- **Real-Time Calculations**: Dynamic ETA updates based on changing conditions
- **Traffic Integration**: Real-time traffic data for accurate time estimates
- **Machine Learning**: ML models for demand prediction and preparation time estimation
- **Multi-Source Data**: Combines traffic, weather, historical patterns, and real-time updates
- **Business Intelligence**: Provides insights for operational optimization

**Why Not Alternatives?**
- **Static ETAs**: Would not account for real-time traffic and conditions
- **Third-Party Services**: Expensive, less control, potential reliability issues
- **Simple Distance Calculations**: Would ignore traffic, preparation time, and other factors

**How It Addresses Requirements:**
- **Customer Experience**: Accurate delivery times improve customer satisfaction
- **Operational Efficiency**: Better planning for restaurants and drivers
- **Real-Time Updates**: Dynamic ETA adjustments based on changing conditions

#### **8. Elasticsearch for Advanced Search (Phase 2)**

**Why Elasticsearch?**
- **Full-Text Search**: Advanced text search with fuzzy matching and synonyms
- **Relevance Scoring**: ML-based ranking for better search results
- **Aggregations**: Faceted search with counts and analytics
- **Scalability**: Horizontal scaling for high-volume search operations
- **Analytics**: Search trend analysis and optimization insights

**Why Not Alternatives?**
- **PostgreSQL Full-Text**: Limited advanced search capabilities
- **Algolia**: Expensive for high-volume usage
- **Solr**: More complex to operate and maintain

**How It Addresses Requirements:**
- **Complex Search**: Multi-criteria search across restaurants and food items
- **Search Performance**: Dedicated search service for optimal performance
- **User Experience**: Better search results with relevance scoring

#### **9. Docker and Kubernetes for Deployment**

**Why Docker?**
- **Consistency**: Same environment across development, staging, and production
- **Isolation**: Services don't interfere with each other
- **Portability**: Easy deployment across different infrastructure
- **Resource Efficiency**: Lightweight compared to virtual machines

**Why Kubernetes?**
- **Auto-scaling**: Automatically scale services based on load
- **Service Discovery**: Built-in load balancing and service mesh
- **Rolling Updates**: Zero-downtime deployments
- **Health Monitoring**: Built-in health checks and failover

**How It Addresses Requirements:**
- **High Availability**: Automatic failover and recovery
- **Scalability**: Auto-scaling based on traffic patterns
- **Reliability**: Health checks ensure only healthy instances receive traffic

#### **10. CDN for Static Content**

**Why CDN?**
- **Global Distribution**: Serve images and static assets from edge locations
- **Low Latency**: Reduced round-trip time for static content
- **Bandwidth Savings**: Reduce load on origin servers
- **Caching**: Intelligent caching strategies for different content types

**Why Not Alternatives?**
- **Origin Server**: Higher latency for global users
- **Multiple Origins**: Complex to manage and maintain
- **Self-hosted CDN**: High operational overhead

**How It Addresses Requirements:**
- **P99 < 200ms**: Faster image loading improves overall page performance
- **Global Users**: Consistent performance regardless of user location
- **High Traffic**: Reduces load on application servers

#### **11. JWT for Authentication**

**Why JWT?**
- **Stateless**: No server-side session storage needed
- **Scalability**: Works across multiple service instances
- **Security**: Tamper-proof tokens with expiration
- **Standards**: Industry-standard authentication mechanism
- **Microservices**: Perfect for distributed service architecture

**Why Not Alternatives?**
- **Session-based**: Requires shared session storage across services
- **OAuth**: Overkill for simple customer authentication
- **API Keys**: Less secure, harder to manage user-specific permissions

**How It Addresses Requirements:**
- **Service Independence**: Each service can validate tokens independently
- **Scalability**: No shared state between services
- **Security**: Secure authentication without complex session management

### Technology Trade-offs and Considerations

#### **Performance vs. Complexity**
- **PostgreSQL GIN vs. Elasticsearch**: Start simple, add complexity when needed
- **Redis vs. Kafka**: Use Redis for simple caching, Kafka for complex event streaming
- **Monolithic vs. Microservices**: Accept initial complexity for long-term scalability

#### **Cost vs. Performance**
- **Managed Services**: Higher cost but lower operational overhead
- **Self-hosted**: Lower cost but higher operational complexity
- **Hybrid Approach**: Use managed services for critical components, self-hosted for others

#### **Scalability vs. Maintainability**
- **Microservices**: Better scalability but more complex to maintain
- **Monolithic**: Easier to maintain but harder to scale
- **Balanced Approach**: Microservices for core business logic, shared components for common functionality

### Future Technology Evolution

#### **Phase 1 (Immediate)**
- PostgreSQL with GIN indexes for basic search
- Redis for caching and session management
- Basic microservices architecture
- Basic ETA calculations using PostGIS distance functions
- Kafka for event streaming and real-time updates

#### **Phase 2 (6-12 months)**
- Enhanced monitoring and observability
- Advanced ETA calculations with traffic data
- Performance optimization based on usage patterns
- Additional service instances as needed

#### **Phase 3 (12+ months)**
- Elasticsearch for advanced search capabilities (if needed)
- Machine learning models for demand prediction
- Real-time traffic integration
- Advanced analytics and business intelligence

This technology stack provides the optimal balance of performance, scalability, reliability, and maintainability for the Swift Eats food delivery platform while allowing for future growth and enhancement.

## Driver Assignment Service Integration

### **Service Architecture Overview**

The Driver Assignment Service is a critical component that ensures optimal driver-order matching based on multiple factors including proximity, availability, and workload distribution.

#### **1. Assignment Algorithm Components**
- **Proximity Calculation**: PostGIS-based distance calculations between driver and restaurant
- **Availability Check**: Real-time driver status and current order tracking
- **Workload Balancing**: Distribute orders evenly across available drivers
- **Performance Metrics**: Track driver performance for algorithm optimization

#### **2. Integration Points**
- **Orders Service**: Receives order creation events and requests driver assignment
- **Driver Service**: Monitors driver location and availability updates
- **Restaurant Service**: Provides restaurant location and preparation time estimates
- **Kafka Events**: Publishes driver assignment events for real-time tracking

#### **2.1 Orders ↔ Driver Assignment Message Contracts**

**Request: AssignmentRequested**
- `eventId` (UUID), `eventType`, `occurredAt`
- `orderId`, `customerLocation`, `restaurantLocation`
- `prepTimeTotal`, `prepTimeRemaining`, `items`
- `geoKey` (city/zone id), `priority` (derived from slack), `version`

**Response: DriverAssigned | AssignmentFailed**
- Common: `eventId`, `correlationId` (request `eventId`), `orderId`, `occurredAt`, `geoKey`
- `DriverAssigned`: `driverId`, `driverETAtoRestaurant`, `etaRestaurantToCustomer`, `assignmentScore`
- `AssignmentFailed`: `reason`, `retryAfterSeconds`

#### **2.2 Prioritization and Scheduling Details**
- Compute slack: `slack = prepTimeRemaining - driverToRestaurantETA`; lower slack = higher priority.
- Use min-heap or Redis sorted set keyed by `readyAt` and `slack` for candidate orders per geo.
- Re-evaluate on driver location updates and prep-time changes; re-rank affected orders.

#### **2.3 Topic & Partitioning Schema**
- Topics per geo: `driver_assignment.requests.{geoKey}`, `driver_assignment.events.{geoKey}`.
- Partitions sized to expected peak RPS; busy geos provision more partitions.
- Round-robin partitioner for even distribution; key by `orderId` to keep per-order ordering.

#### **2.4 Failure Handling**
- Retries with jittered exponential backoff; cap max attempts; route to DLQ on exhaustion.
- Idempotent assignment: ignore duplicates by `(orderId, version)`.
- Compensations: if driver declines or times out, emit reassignment request with incremented `version`.

#### **3. Assignment Workflow**
- **Order Creation**: Orders Service sends assignment request
- **Driver Selection**: Algorithm selects optimal driver based on criteria
- **Assignment Confirmation**: Driver receives order assignment notification
- **Real-time Updates**: Assignment status published to Kafka for tracking

#### **4. Fallback and Reassignment**
- **Driver Unavailable**: Automatic reassignment to next best available driver
- **Performance Degradation**: Reassignment if driver performance drops
- **Emergency Handling**: Manual override capabilities for urgent situations
- **Load Balancing**: Prevent driver overload during peak hours

### **Performance and Scalability**
- **Response Time**: Driver assignment within 100ms for optimal user experience
- **Concurrent Processing**: Handle multiple assignment requests simultaneously
- **Geographic Partitioning**: Location-based assignment processing for efficiency
- **Caching Strategy**: Redis-based caching for driver availability and location data

## Future Enhancements

### Planned Features
- ETA service implementation
- Advanced analytics and reporting
- Machine learning for demand prediction
- Real-time traffic integration for ETA accuracy

### Technology Evolution
- Migration to more advanced streaming platforms if needed
- Advanced caching strategies
- Database optimization based on usage patterns
