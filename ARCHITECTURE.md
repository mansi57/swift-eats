# Swift Eats - Food Delivery Platform Architecture

## Overview
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
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Search Service  │  ETA Service (Future)  │  Tracking Service                    │
│                  │                         │                                      │
│  • Unified Search│  • ETA Calculations    │  • Real-time Order Tracking          │
│  • GIN + ES      │  • Distance/Time       │  • Driver Location Updates           │
│  • Smart Caching │  • Traffic Analysis    │  • GPS Event Processing              │
│  • Analytics     │  • ML Predictions      │  • Push Notifications                │
└────────────────────┴─────────────────────────┴──────────────────────────────────────┘
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
Driver GPS → Driver Service → Kafka Topic → Push Service → Customer App
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
- **Phase 1**: PostgreSQL GIN indexes with custom search logic and alias support
- **Phase 2**: Elasticsearch for advanced search capabilities with fuzzy matching
- **Caching**: Redis for search result caching with location-based keys and TTL
- **Queue Integration**: Kafka for restaurant availability updates and cache invalidation
- **API**: RESTful endpoints for different search types

**Scaling Strategy**:
- **Horizontal Scaling**: Multiple search service instances
- **Read Replicas**: Dedicated read replicas for search operations
- **Location-based Sharding**: Geographic partitioning for search results
- **Cache Distribution**: Redis cluster for high-performance caching
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

### 5. ETA Service (Future Implementation)
**Purpose**: Calculate delivery ETAs based on multiple factors

**Characteristics**:
- Asynchronous processing
- CPU-intensive calculations
- Batch processing capability
- Real-time traffic integration
- Machine learning for demand prediction

**Responsibilities**:
- **ETA Calculation**: Using restaurant location, customer location, and food preparation time
- **Distance and Time Calculations**: PostGIS-based geospatial calculations
- **Traffic Pattern Analysis**: Real-time traffic data integration for accurate ETAs
- **Demand Prediction**: ML-based prediction of order volume and preparation times
- **Dynamic Routing**: Optimal delivery route calculation considering traffic
- **ETA Updates**: Real-time ETA adjustments based on changing conditions

**Technology Stack**:
- **Message Queue**: Apache Kafka for order events and ETA requests
- **Geospatial Calculations**: PostGIS functions for distance and route calculations
- **Machine Learning**: TensorFlow/PyTorch for demand prediction models
- **Traffic API**: Google Maps, Waze, or OpenStreetMap for real-time traffic
- **Caching**: Redis for ETA result caching and traffic pattern storage
- **API**: Internal service endpoints for ETA requests

**Scaling Strategy**:
- **Worker Pool Pattern**: Multiple ETA calculation workers
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
- **Advisory Lock (Optional)**: Short-lived Redis `SETNX driver:{id}:lock` (10–15s) during selection to reduce hot-spot contention; DB CAS remains the source of truth.
- **Idempotency/Fencing**: Include `orderVersion`/`assignmentVersion` with events; consumers ignore stale events.

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

#### **Phase 2 (6-12 months)**
- Elasticsearch for advanced search capabilities
- Kafka for event streaming and real-time updates
- Advanced monitoring and observability
- ETA Service with traffic data integration
- Machine learning models for demand prediction

#### **Phase 3 (12+ months)**
- Advanced ML models for ETA accuracy
- Real-time traffic integration with multiple APIs
- Weather and seasonal pattern integration
- Driver behavior analysis for route optimization
- Predictive analytics for restaurant preparation times

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
