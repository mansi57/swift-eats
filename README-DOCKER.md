# Swift Eats - Docker Deployment Guide

This guide explains how to deploy the Swift Eats microservices platform using Docker and Docker Compose.

## 🐳 Quick Start

### Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (to clone the repository)

### One-Command Setup

```bash
# Clone the repository
git clone <repository-url>
cd swift-eats

# Run the setup script (Linux/macOS)
./scripts/docker-setup.sh setup

# Or manually start services
docker-compose up -d --build
```

## 📁 Docker Files Overview

### Core Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Dockerfile for all microservices |
| `docker-compose.yml` | Development environment configuration |
| `docker-compose.prod.yml` | Production environment configuration |
| `.dockerignore` | Excludes unnecessary files from Docker builds |
| `healthcheck.js` | Health check script for Docker containers |

### Configuration Files

| File | Purpose |
|------|---------|
| `nginx/nginx.conf` | Load balancer configuration for production |
| `scripts/init-db.sql` | Database initialization script |
| `scripts/docker-setup.sh` | Automated setup and management script |

## 🚀 Deployment Options

### 1. Development Environment

```bash
# Start all services for development
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Production Environment

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

## 🏗️ Architecture Overview

### Services

| Service | Port | Purpose | Replicas (Prod) |
|---------|------|---------|-----------------|
| **Orders Service** | 3001 | Order management | 3 |
| **Restaurant Service** | 3002 | Restaurant & menu management | 2 |
| **GPS Service** | 3003 | GPS data ingestion | 5 |
| **Location Service** | 3004 | Real-time location processing | 10 |
| **Driver Assignment Service** | 3005 | Driver assignment logic | 5 |
| **API Gateway** | 3000 | Load balancer & routing | 1 |

### Infrastructure

| Component | Port | Purpose |
|-----------|------|---------|
| **PostgreSQL** | 5432 | Primary database (with PostGIS) |
| **Redis** | 6379 | Caching & session storage |
| **Kafka** | 9092 | Event streaming |
| **Zookeeper** | 2181 | Kafka coordination |
| **Nginx** | 80/443 | Production load balancer |

### Monitoring Tools

| Tool | Port | Purpose |
|------|------|---------|
| **Kafka UI** | 8080 | Kafka topic monitoring |
| **Redis Commander** | 8081 | Redis data browser |

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
POSTGRES_DB=swift_eats
POSTGRES_USER=swift_eats_user
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration
REDIS_PASSWORD=your_redis_password

# Kafka Configuration
KAFKA_HOST=localhost

# Service Configuration
NODE_ENV=production
LOG_LEVEL=info
```

### SSL Certificates (Production)

For HTTPS in production, place your SSL certificates in `nginx/ssl/`:

```bash
nginx/ssl/
├── cert.pem    # SSL certificate
└── key.pem     # Private key
```

## 📊 Service Management

### Using the Setup Script

The `scripts/docker-setup.sh` script provides easy management:

```bash
# Initial setup
./scripts/docker-setup.sh setup

# Start services
./scripts/docker-setup.sh start

# Start production services
./scripts/docker-setup.sh start:prod

# Stop services
./scripts/docker-setup.sh stop

# Restart services
./scripts/docker-setup.sh restart

# View status
./scripts/docker-setup.sh status

# View logs
./scripts/docker-setup.sh logs
./scripts/docker-setup.sh logs orders-service

# Run tests
./scripts/docker-setup.sh test

# Clean up
./scripts/docker-setup.sh cleanup

# Show help
./scripts/docker-setup.sh help
```

### Manual Docker Commands

```bash
# Build and start all services
docker-compose up -d --build

# Start specific service
docker-compose up -d orders-service

# View service logs
docker-compose logs -f orders-service

# Execute command in container
docker-compose exec orders-service npm run test

# Scale service
docker-compose up -d --scale location-service=5

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v
```

## 🔍 Monitoring & Debugging

### Health Checks

All services include health check endpoints:

```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

### Service Status

```bash
# View all running containers
docker-compose ps

# View resource usage
docker stats

# View service logs
docker-compose logs -f
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U swift_eats_user -d swift_eats

# Connect to Redis
docker-compose exec redis redis-cli
```

## 🧪 Testing

### Run All Tests

```bash
# Using the setup script
./scripts/docker-setup.sh test

# Or manually
docker-compose exec location-service npm run test:location
docker-compose exec orders-service npm run test:order-assignment
docker-compose exec location-service npm run test:sse-efficiency
```

### Test Individual Services

```bash
# Test GPS Service
curl -X POST http://localhost:3003/gps/location \
  -H "Content-Type: application/json" \
  -d '{"driverId": "driver1", "latitude": 40.7128, "longitude": -74.0060, "timestamp": "2024-01-01T12:00:00Z"}'

# Test Location Service
curl http://localhost:3004/location/driver/driver1

# Test Restaurant Service
curl http://localhost:3002/restaurants/nearby?lat=40.7128&lon=-74.0060&radius=5
```

## 🔒 Security Considerations

### Production Security

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **SSL/TLS**: Use proper SSL certificates for HTTPS
3. **Network Security**: Restrict container network access
4. **Secrets Management**: Use Docker secrets or external secret management
5. **Regular Updates**: Keep base images updated

### Security Headers

Nginx is configured with security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale Location Service to 10 instances
docker-compose up -d --scale location-service=10

# Scale GPS Service to 5 instances
docker-compose up -d --scale gps-service=5
```

### Production Scaling

The production compose file includes:

- **Resource Limits**: CPU and memory limits for each service
- **Replica Configuration**: Pre-configured replica counts
- **Update Strategy**: Rolling updates with health checks
- **Load Balancing**: Nginx load balancer with upstream configuration

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using a port
   lsof -i :3001
   
   # Stop conflicting service
   docker-compose down
   ```

2. **Database Connection Issues**
   ```bash
   # Check database health
   docker-compose exec postgres pg_isready -U swift_eats_user
   
   # View database logs
   docker-compose logs postgres
   ```

3. **Kafka Issues**
   ```bash
   # Check Kafka topics
   docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
   
   # View Kafka logs
   docker-compose logs kafka
   ```

4. **Service Health Issues**
   ```bash
   # Check service health
   curl http://localhost:3001/health
   
   # View service logs
   docker-compose logs orders-service
   ```

### Performance Issues

1. **High Memory Usage**
   ```bash
   # Check memory usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

2. **Slow Response Times**
   ```bash
   # Check Redis cache hit rate
   docker-compose exec redis redis-cli info memory
   
   # Check database performance
   docker-compose exec postgres psql -U swift_eats_user -d swift_eats -c "SELECT * FROM pg_stat_activity;"
   ```

## 🔄 Updates & Maintenance

### Updating Services

```bash
# Pull latest changes
git pull

# Rebuild and restart services
docker-compose down
docker-compose up -d --build
```

### Database Migrations

```bash
# Run database migrations
docker-compose exec postgres psql -U swift_eats_user -d swift_eats -f /docker-entrypoint-initdb.d/migration.sql
```

### Backup & Restore

```bash
# Backup database
docker-compose exec postgres pg_dump -U swift_eats_user swift_eats > backup.sql

# Restore database
docker-compose exec -T postgres psql -U swift_eats_user swift_eats < backup.sql
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🤝 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review service logs: `docker-compose logs -f`
3. Check the main [ARCHITECTURE.md](ARCHITECTURE.md) for system design details
4. Review [IMPLEMENTATION.md](IMPLEMENTATION.md) for implementation specifics

---

**Happy Deploying! 🚀**
