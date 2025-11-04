# E-commerce Microservices Platform

A microservices-based e-commerce platform built with Node.js, TypeScript, and Docker.

## Services

- **User Service** (Port 3001) - Authentication and user management
- **Product Service** (Port 3002) - Product catalog management
- **Cart Service** (Port 3003) - Shopping cart operations
- **Order Service** (Port 3004) - Order processing
- **Notification Service** (Port 3005) - Email/notification handling
- **API Gateway** (Port 3000) - Single entry point for all services

## Tech Stack

- **Runtime:** Node.js 20
- **Language:** TypeScript
- **Databases:** PostgreSQL, Redis
- **Message Queue:** RabbitMQ
- **Containerization:** Docker & Docker Compose

## Getting Started

### Prerequisites
- Docker Desktop with WSL2
- Node.js 20+

### Run the Application
```bash
# In WSL2 terminal
cd /mnt/c/Users/YourUsername/Documents/ecommerce-microservices

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Development

Each service can be developed independently. See individual service README files for details.