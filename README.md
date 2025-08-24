# Swift Eats - Real-time Food Delivery Platform API

A high-performance, scalable Node.js API for a real-time food delivery platform built with Express, PostgreSQL, Redis, and Kafka.

## 🚀 Features

- **Restaurant Discovery**: Location-based restaurant search with PostGIS geospatial queries
- **Menu Management**: Real-time menu updates with caching
- **Order Processing**: Transactional order creation with inventory management
- **Real-time Tracking**: Driver location updates and ETA calculations
- **Advanced Search**: Multi-criteria search across restaurants and food items
- **Authentication**: JWT-based customer authentication and authorization
- **Caching**: Multi-layer caching strategy with Redis
- **Rate Limiting**: API rate limiting to prevent abuse
- **Validation**: Request validation using Joi schemas
- **Logging**: Structured logging with Winston
- **Error Handling**: Comprehensive error handling and logging

## 🏗️ Architecture

The API follows a microservices architecture pattern with:

- **Express.js** for the web framework
- **PostgreSQL** with PostGIS for geospatial data and ACID compliance
- **Redis** for caching and session management
- **Kafka** for real-time event streaming (planned)
- **JWT** for authentication
- **Rate limiting** for API protection
- **Multi-layer caching** for performance optimization

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+ with PostGIS extension
- Redis 6+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swift-eats
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create database and enable PostGIS
   createdb swift_eats
   psql swift_eats -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   
   # Run database migrations (see database setup section)
   ```

5. **Start Redis server**
   ```bash
   redis-server
   ```

## 🗄️ Database Setup

The API requires PostgreSQL with PostGIS extension. You can set up the database using the SQL scripts in the `database/` directory:

```bash
# Create database
createdb swift_eats

# Enable PostGIS
psql swift_eats -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run schema creation (see database/schema.sql)
psql swift_eats -f database/schema.sql
```

## ⚙️ Configuration

Key environment variables in `.env`:

```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swift_eats
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## 🚀 Running the API

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 📚 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Restaurants

#### Get Restaurants by Location
```http
GET /restaurants?location=40.7128,-74.0060&radius=10&cuisine=italian
```

#### Get Restaurant by ID
```http
GET /restaurants/{id}
```

#### Get Restaurant Menu
```http
GET /restaurants/{id}/menu
```

### Food Items

#### Get Food Item by ID
```http
GET /food-items/{id}
```

### Search

#### Search Restaurants and Food Items
```http
POST /search
Content-Type: application/json

{
  "customerLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "foodItem": "pizza",
  "radius": 10,
  "cuisine": "italian",
  "dietary": "veg",
  "maxPrice": 25
}
```

### Orders

#### Get Customer Orders
```http
GET /orders?customerId={id}&status=active&limit=20&offset=0
```

#### Create New Order
```http
POST /orders
Content-Type: application/json

{
  "destination": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "restaurant": "restaurant-uuid",
  "items": [
    {
      "id": "food-item-uuid",
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 15.99,
      "specialInstructions": "Extra cheese please"
    }
  ],
  "specialInstructions": "Ring doorbell twice"
}
```

#### Get Order by ID
```http
GET /orders/{id}
```

#### Update Order Status
```http
PUT /orders/{id}/status
Content-Type: application/json

{
  "status": "assigned_driver",
  "driverId": "driver-uuid",
  "estimatedDeliveryTime": "2024-01-15T20:30:00Z"
}
```

### Tracking

#### Get Order Tracking
```http
GET /tracking/{orderId}
```

#### Get Driver Location
```http
GET /tracking/{orderId}/driver-location
```

#### Get Order ETA
```http
GET /tracking/{orderId}/eta
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📊 Performance Features

- **Geospatial Indexing**: PostGIS spatial indexes for location-based queries
- **Multi-layer Caching**: CDN → Redis → Application → Database
- **Connection Pooling**: PostgreSQL connection pooling for high concurrency
- **Rate Limiting**: API rate limiting to prevent abuse
- **Compression**: Response compression for bandwidth optimization
- **Query Optimization**: Optimized SQL queries with proper indexing

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Request validation using Joi schemas
- **Rate Limiting**: Protection against API abuse
- **SQL Injection Protection**: Parameterized queries

## 📈 Monitoring and Logging

- **Winston Logger**: Structured logging with multiple transports
- **Request Logging**: HTTP request/response logging
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Metrics**: Query execution time tracking
- **Health Checks**: Application health monitoring

## 🚀 Deployment

### Docker (Recommended)
```bash
# Build image
docker build -t swift-eats-api .

# Run container
docker run -p 3000:3000 --env-file .env swift-eats-api
```

### Manual Deployment
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name "swift-eats-api"

# Monitor
pm2 monit
```

## 🔧 Development

### Project Structure
```
src/
├── controllers/          # Business logic controllers
├── middleware/          # Express middleware
├── routes/             # API route definitions
├── utils/              # Utility functions
└── server.js           # Main application file
```

### Adding New Endpoints
1. Create controller in `src/controllers/`
2. Define route in `src/routes/`
3. Add validation schema in `src/middleware/validation.js`
4. Update API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/v1`

## 🔮 Future Enhancements

- **Kafka Integration**: Real-time event streaming
- **Elasticsearch**: Advanced search capabilities
- **Microservices**: Service decomposition
- **Kubernetes**: Container orchestration
- **GraphQL**: Alternative API interface
- **WebSocket Support**: Real-time bidirectional communication
- **Mobile Push Notifications**: Customer engagement
- **Analytics Dashboard**: Business intelligence
- **Machine Learning**: Demand prediction and route optimization
