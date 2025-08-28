#!/bin/bash

# Swift Eats Docker Setup Script
# This script helps set up and run the Swift Eats microservices using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Function to check if ports are available
check_ports() {
    local ports=("3000" "3001" "3002" "3003" "3004" "3005" "5432" "6379" "9092" "2181" "8080" "8081")
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use. Please stop the service using this port."
        fi
    done
}

# Function to create environment file
create_env_file() {
    if [ ! -f .env ]; then
        print_status "Creating .env file with default values..."
        cat > .env << EOF
# Database Configuration
POSTGRES_DB=swift_eats
POSTGRES_USER=swift_eats_user
POSTGRES_PASSWORD=swift_eats_password_$(date +%s)

# Redis Configuration
REDIS_PASSWORD=redis_password_$(date +%s)

# Kafka Configuration
KAFKA_HOST=localhost

# Service Configuration
NODE_ENV=development
LOG_LEVEL=info

# API Gateway Configuration
API_GATEWAY_PORT=3000

# Service Ports
ORDERS_SERVICE_PORT=3001
RESTAURANT_SERVICE_PORT=3002
GPS_SERVICE_PORT=3003
LOCATION_SERVICE_PORT=3004
DRIVER_ASSIGNMENT_SERVICE_PORT=3005
EOF
        print_success "Created .env file"
    else
        print_warning ".env file already exists"
    fi
}

# Function to create SSL certificates for production
create_ssl_certs() {
    if [ ! -d nginx/ssl ]; then
        print_status "Creating SSL certificates directory..."
        mkdir -p nginx/ssl
        
        # Generate self-signed certificate for development
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=SwiftEats/CN=localhost" 2>/dev/null || {
            print_warning "Could not generate SSL certificate. Using HTTP only."
            rm -rf nginx/ssl
        }
        
        if [ -d nginx/ssl ]; then
            print_success "Created SSL certificates"
        fi
    fi
}

# Function to build and start services
start_services() {
    local environment=${1:-development}
    
    print_status "Starting Swift Eats services in $environment mode..."
    
    if [ "$environment" = "production" ]; then
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        docker-compose up -d --build
    fi
    
    print_success "Services started successfully!"
}

# Function to wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    until docker-compose exec -T postgres pg_isready -U swift_eats_user -d swift_eats >/dev/null 2>&1; do
        sleep 2
    done
    print_success "PostgreSQL is ready"
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    until docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; do
        sleep 2
    done
    print_success "Redis is ready"
    
    # Wait for Kafka
    print_status "Waiting for Kafka..."
    until docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list >/dev/null 2>&1; do
        sleep 5
    done
    print_success "Kafka is ready"
    
    # Wait for microservices
    local services=("orders-service" "restaurant-service" "gps-service" "location-service" "driver-assignment-service")
    
    for service in "${services[@]}"; do
        print_status "Waiting for $service..."
        until curl -f http://localhost:$(docker-compose port $service 3000 | cut -d: -f2)/health >/dev/null 2>&1; do
            sleep 3
        done
        print_success "$service is ready"
    done
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    echo ""
    
    # Show running containers
    docker-compose ps
    
    echo ""
    print_status "Service URLs:"
    echo "  API Gateway:     http://localhost:3000"
    echo "  Orders Service:  http://localhost:3001"
    echo "  Restaurant Service: http://localhost:3002"
    echo "  GPS Service:     http://localhost:3003"
    echo "  Location Service: http://localhost:3004"
    echo "  Driver Assignment: http://localhost:3005"
    echo "  Kafka UI:        http://localhost:8080"
    echo "  Redis Commander: http://localhost:8081"
    echo ""
    
    print_status "Database Connection:"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis:      localhost:6379"
    echo "  Kafka:      localhost:9092"
}

# Function to stop services
stop_services() {
    print_status "Stopping Swift Eats services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $service..."
        docker-compose logs -f "$service"
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Run location service tests
    docker-compose exec location-service npm run test:location
    
    # Run order assignment tests
    docker-compose exec orders-service npm run test:order-assignment
    
    # Run SSE efficiency tests
    docker-compose exec location-service npm run test:sse-efficiency
    
    print_success "Tests completed"
}

# Function to show help
show_help() {
    echo "Swift Eats Docker Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup           Set up the environment and start services (development)"
    echo "  start           Start services"
    echo "  start:prod      Start services in production mode"
    echo "  stop            Stop services"
    echo "  restart         Restart services"
    echo "  status          Show service status"
    echo "  logs [SERVICE]  Show logs (all services or specific service)"
    echo "  test            Run tests"
    echo "  cleanup         Clean up Docker resources"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup        # Initial setup and start"
    echo "  $0 logs         # Show all logs"
    echo "  $0 logs orders-service  # Show orders service logs"
    echo "  $0 start:prod   # Start in production mode"
}

# Main script logic
case "${1:-setup}" in
    "setup")
        print_status "Setting up Swift Eats microservices..."
        check_docker
        check_ports
        create_env_file
        create_ssl_certs
        start_services development
        wait_for_services
        show_status
        print_success "Setup completed successfully!"
        ;;
    "start")
        start_services development
        wait_for_services
        show_status
        ;;
    "start:prod")
        start_services production
        wait_for_services
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        start_services development
        wait_for_services
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "test")
        run_tests
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
