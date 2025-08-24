# Swift Eats - Project Structure

## Overview
This document outlines the project structure for the Swift Eats food delivery platform, explaining the purpose of each folder and key modules.

## Project Organization

```
swift-eats/
├── docs/                           # Documentation files
│   ├── ARCHITECTURE.md            # System architecture and design decisions
│   ├── API-SPECIFICATION.yml      # OpenAPI specification for all endpoints
│   └── PROJECT_STRUCTURE.md       # This file - project organization
├── services/                       # Microservices
│   ├── restaurant-service/         # Restaurant and menu management
│   ├── orders-service/            # Order processing and management
│   ├── eta-service/               # ETA calculation service (future)
│   └── auth-service/              # JWT authentication and authorization
├── shared/                         # Shared components and utilities
│   ├── database/                  # Database schemas and migrations
│   ├── models/                    # Shared data models and DTOs
│   ├── utils/                     # Common utility functions
│   └── middleware/                # Shared middleware components
├── infrastructure/                 # Infrastructure and deployment
│   ├── docker/                    # Docker configurations
│   ├── kubernetes/                # Kubernetes manifests
│   ├── terraform/                 # Infrastructure as code
│   └── monitoring/                # Monitoring and logging setup
├── frontend/                       # Customer-facing web application
│   ├── src/                       # Source code
│   ├── public/                    # Static assets
│   └── package.json               # Frontend dependencies
├── mobile/                        # Mobile applications (future)
│   ├── ios/                       # iOS application
│   └── android/                   # Android application
├── scripts/                       # Utility scripts
├── tests/                         # Integration and end-to-end tests
├── .github/                       # GitHub Actions workflows
├── docker-compose.yml             # Local development setup
├── README.md                      # Project overview and setup
└── .gitignore                     # Git ignore patterns
```

## Service Architecture

### 1. Restaurant Service (`services/restaurant-service/`)
**Purpose**: Handle restaurant discovery, menu management, and search functionality

**Key Responsibilities**:
- Restaurant CRUD operations
- Food item management
- Location-based restaurant discovery
- Search functionality (restaurant name, cuisine, food type)
- Menu availability management

**Technology Stack**:
- Backend: Node.js/Express or Python/FastAPI
- Database: PostgreSQL with PostGIS
- Caching: Redis
- Search: PostgreSQL GIN indexes + Elasticsearch

**Key Modules**:
- `controllers/` - API endpoint handlers
- `services/` - Business logic layer
- `models/` - Data models and database operations
- `middleware/` - Authentication, validation, caching
- `utils/` - Location calculations, search algorithms

### 2. Orders Service (`services/orders-service/`)
**Purpose**: Handle order processing, lifecycle management, and business logic

**Key Responsibilities**:
- Order creation and validation
- Order status management
- Payment processing (mocked)
- Business rule enforcement
- Order lifecycle management

**Technology Stack**:
- Backend: Node.js/Express or Python/FastAPI
- Database: PostgreSQL (ACID compliance)
- Message Queue: Redis Pub/Sub or Apache Kafka
- Transaction Management: Database-level transactions

**Key Modules**:
- `controllers/` - Order API endpoints
- `services/` - Order business logic
- `models/` - Order data models
- `validators/` - Order validation rules
- `processors/` - Order processing workflows

### 3. ETA Service (`services/eta-service/`) - Future Implementation
**Purpose**: Calculate delivery ETAs based on multiple factors

**Key Responsibilities**:
- ETA calculation using restaurant location, customer location, and food preparation time
- Distance and time calculations
- Traffic pattern analysis (future enhancement)

**Technology Stack**:
- Backend: Node.js/Express or Python/FastAPI
- Message Queue: Redis Pub/Sub or Apache Kafka
- Geospatial calculations: PostGIS functions

**Key Modules**:
- `calculators/` - ETA calculation algorithms
- `processors/` - Message queue processors
- `models/` - ETA data models
- `utils/` - Geospatial calculations

### 4. Auth Service (`services/auth-service/`)
**Purpose**: Handle JWT authentication and authorization

**Key Responsibilities**:
- JWT token generation and validation
- Customer authentication
- Authorization middleware
- Token refresh and management

**Technology Stack**:
- Backend: Node.js/Express or Python/FastAPI
- JWT: jsonwebtoken library
- Database: PostgreSQL for user management
- Redis: Token blacklisting and session management

**Key Modules**:
- `controllers/` - Authentication endpoints
- `middleware/` - JWT validation middleware
- `services/` - Authentication business logic
- `models/` - User and session models

## Shared Components (`shared/`)

### Database (`shared/database/`)
**Purpose**: Centralized database schemas, migrations, and connection management

**Contents**:
- `schemas/` - Database table definitions
- `migrations/` - Database version control
- `seeds/` - Initial data population
- `connections/` - Database connection pools

### Models (`shared/models/`)
**Purpose**: Shared data models and DTOs used across services

**Contents**:
- `entities/` - Core business entities
- `dtos/` - Data transfer objects
- `enums/` - Common enumerations
- `interfaces/` - TypeScript interfaces (if using TS)

### Utils (`shared/utils/`)
**Purpose**: Common utility functions used across services

**Contents**:
- `location/` - Geospatial calculations
- `validation/` - Common validation functions
- `formatting/` - Data formatting utilities
- `crypto/` - Cryptographic utilities

### Middleware (`shared/middleware/`)
**Purpose**: Shared middleware components

**Contents**:
- `auth/` - Authentication middleware
- `validation/` - Request validation
- `logging/` - Request logging
- `error-handling/` - Error handling middleware

## Infrastructure (`infrastructure/`)

### Docker (`infrastructure/docker/`)
**Purpose**: Containerization configuration for all services

**Contents**:
- `restaurant-service/` - Restaurant service Dockerfile
- `orders-service/` - Orders service Dockerfile
- `auth-service/` - Auth service Dockerfile
- `postgresql/` - Database Docker configuration
- `redis/` - Redis Docker configuration

### Kubernetes (`infrastructure/kubernetes/`)
**Purpose**: Production deployment and orchestration

**Contents**:
- `deployments/` - Service deployments
- `services/` - Kubernetes services
- `ingress/` - API gateway configuration
- `configmaps/` - Configuration management
- `secrets/` - Secret management

### Terraform (`infrastructure/terraform/`)
**Purpose**: Infrastructure as code for cloud resources

**Contents**:
- `modules/` - Reusable infrastructure modules
- `environments/` - Environment-specific configurations
- `variables/` - Terraform variables
- `outputs/` - Infrastructure outputs

### Monitoring (`infrastructure/monitoring/`)
**Purpose**: Observability and monitoring setup

**Contents**:
- `prometheus/` - Metrics collection
- `grafana/` - Dashboards and visualization
- `logging/` - Centralized logging setup
- `alerting/` - Alert rules and notifications

## Frontend (`frontend/`)

**Purpose**: Customer-facing web application

**Key Features**:
- Restaurant browsing and search
- Menu viewing and food item selection
- Order placement and management
- Real-time order tracking
- User authentication and profile management

**Technology Stack**:
- Framework: React.js or Vue.js
- State Management: Redux or Vuex
- Real-time: WebSocket or Server-Sent Events
- Styling: CSS-in-JS or SCSS
- Build Tool: Webpack or Vite

**Key Modules**:
- `components/` - Reusable UI components
- `pages/` - Application pages
- `services/` - API integration
- `store/` - State management
- `utils/` - Frontend utilities

## Testing Strategy (`tests/`)

### Test Types
- **Unit Tests**: Individual service and component testing
- **Integration Tests**: Service-to-service communication testing
- **End-to-End Tests**: Complete user journey testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication and authorization testing

### Test Organization
- `unit/` - Unit test files
- `integration/` - Integration test files
- `e2e/` - End-to-end test files
- `performance/` - Performance test files
- `fixtures/` - Test data and fixtures

## Development Workflow

### Local Development
- `docker-compose.yml` for local service orchestration
- Hot reloading for development
- Local database and Redis instances
- Mock external services

### CI/CD Pipeline
- Automated testing on pull requests
- Code quality checks (linting, formatting)
- Security vulnerability scanning
- Automated deployment to staging/production

### Environment Management
- Development environment configuration
- Staging environment for testing
- Production environment with monitoring
- Environment-specific configuration files

## Key Benefits of This Structure

1. **Modularity**: Each service is self-contained and independently deployable
2. **Scalability**: Services can be scaled independently based on load
3. **Maintainability**: Clear separation of concerns and responsibilities
4. **Team Collaboration**: Different teams can work on different services
5. **Technology Diversity**: Each service can use the most appropriate technology
6. **Fault Isolation**: Failure in one service doesn't affect others
7. **Testing**: Comprehensive testing strategy for quality assurance

## Future Considerations

### Planned Enhancements
- Mobile application development
- Advanced analytics and reporting
- Machine learning integration
- Real-time traffic integration
- Multi-language support

### Scalability Improvements
- Service mesh implementation
- Advanced caching strategies
- Database optimization
- CDN integration
- Load balancing improvements
