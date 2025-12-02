# E-commerce Microservices Platform

A production-ready e-commerce platform built with microservices architecture, fully containerized with Docker.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Services](#services)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Docker Commands](#docker-commands)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This project demonstrates a complete e-commerce platform built using:

- **Microservices Architecture** - Independent, scalable services
- **Docker Containerization** - Consistent environments across all platforms
- **API Gateway Pattern** - Centralized authentication and routing
- **Event-Driven Architecture** - Asynchronous communication via RabbitMQ
- **Database per Service** - Each service owns its data
- **Type-Safe Development** - TypeScript and Prisma ORM

---

## 🏗️ Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────┐
│                 Client Applications                   │
│            (Web, Mobile, Desktop)                     │
└─────────────────────┬────────────────────────────────┘
                      │
                      │ HTTP/REST
                      │
┌─────────────────────▼────────────────────────────────┐
│              API Gateway (Port 3000)                  │
│                                                       │
│  • Request Routing                                    │
│  • JWT Authentication                                 │
│  • Rate Limiting (100 req/15min)                     │
│  • Request/Response Logging                          │
│  • CORS Handling                                      │
└──┬─────────┬──────────┬──────────┬──────────────────┘
   │         │          │          │
   ▼         ▼          ▼          ▼
┌─────┐  ┌────────┐  ┌──────┐  ┌───────┐
│User │  │Product │  │ Cart │  │ Order │
│Svc  │  │  Svc   │  │ Svc  │  │  Svc  │
│3001 │  │  3002  │  │ 3003 │  │ 3004  │
└──┬──┘  └───┬────┘  └───┬──┘  └───┬───┘
   │         │            │         │
   └─────────┴────────────┘         │
             │                      │
   ┌─────────▼──────────────────────▼─────┐
   │       PostgreSQL Database             │
   │                                       │
   │  Tables:                              │
   │  • users                              │
   │  • products                           │
   │  • orders                             │
   │  • order_items                        │
   └───────────────────────────────────────┘

   ┌──────────┐  ┌────────────┐
   │  Redis   │  │ RabbitMQ   │
   │  :6379   │  │ :5672      │
   │ (Carts)  │  │ (Events)   │
   └──────────┘  └────────────┘
```

### Service Communication

**Synchronous (HTTP/REST):**

- Client → API Gateway → Services
- Cart Service → Product Service (verify products)
- Order Service → Cart Service (get cart items)
- Order Service → Product Service (check stock)

**Asynchronous (Message Queue):**

- Order Service → RabbitMQ → Notification Service (future)
- Events: order_created, order_status_updated, order_cancelled

---

## 🛠️ Tech Stack

### Backend Services

- **Runtime:** Node.js 20
- **Language:** TypeScript 5
- **Framework:** Express.js
- **ORM:** Prisma 5
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt

### Databases

- **PostgreSQL 15** - Relational data (users, products, orders)
- **Redis 7** - In-memory cache (shopping carts)
- **RabbitMQ 3** - Message broker (event-driven communication)

### Infrastructure

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Docker Networks** - Service discovery and isolation
- **Docker Volumes** - Data persistence

---

## ✅ Prerequisites

- **Docker Desktop** (with WSL2 on Windows)
- **Git**
- **Node.js 20+** (for local development only)
- **WSL2** (Windows users)

### Installation Links

- Docker Desktop: https://www.docker.com/products/docker-desktop
- Node.js: https://nodejs.org/
- WSL2: https://docs.microsoft.com/en-us/windows/wsl/install

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd ecommerce-microservices
```

### 2. Setup Environment Variables

```bash
# Copy example environment files
cp .env.example .env

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

**Edit `.env` and update:**

```bash
JWT_SECRET=<generated-secret>
POSTGRES_PASSWORD=postgres
RABBITMQ_PASSWORD=admin
```

### 3. Start All Services

```bash
# Build and start all containers
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### 4. Verify Services

```bash
# Check all containers are running
docker-compose ps

# View logs
docker-compose logs -f

# Test API Gateway
curl http://localhost:3000/health
```

### 5. Access Services

| Service             | URL                    | Credentials       |
| ------------------- | ---------------------- | ----------------- |
| API Gateway         | http://localhost:3000  | -                 |
| RabbitMQ Management | http://localhost:15672 | admin/admin       |
| PostgreSQL          | localhost:5432         | postgres/postgres |
| Redis               | localhost:6379         | -                 |

---

## 🔧 Environment Setup

### Root `.env` File

Create `.env` in project root:

```bash
# JWT Secret (REQUIRED - Generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here

# Database (OK for development, CHANGE for production)
POSTGRES_PASSWORD=postgres

# Message Queue (OK for development, CHANGE for production)
RABBITMQ_PASSWORD=admin
```

### Service-Specific `.env` Files

Each service has its own `.env.example`. Copy to `.env`:

```bash
# Copy all service env files
for service in user-service product-service cart-service order-service api-gateway; do
  cp services/$service/.env.example services/$service/.env
done
```

**Important:**

- `.env` files are gitignored (contain secrets)
- `.env.example` files are committed (templates)
- JWT_SECRET must be the same in `user-service` and `api-gateway`

---

## 📦 Services

### 1. API Gateway (Port 3000)

**Purpose:** Single entry point for all client requests

**Features:**

- Request routing to microservices
- JWT token validation
- Rate limiting (100 requests per 15 minutes per IP)
- Request/Response logging
- CORS handling

**Routes:**

- `/api/users/*` → User Service
- `/api/products/*` → Product Service
- `/api/cart/*` → Cart Service
- `/api/orders/*` → Order Service

---

### 2. User Service (Port 3001)

**Purpose:** User authentication and profile management

**Features:**

- User registration with email/password
- Login with JWT token generation
- Password hashing (bcrypt, 10 salt rounds)
- Profile retrieval
- User data stored in PostgreSQL

**Endpoints:**

- `POST /register` - Create new user
- `POST /login` - Authenticate and get token
- `GET /profile` - Get user profile (protected)

**Database:** PostgreSQL - `users` table

---

### 3. Product Service (Port 3002)

**Purpose:** Product catalog management

**Features:**

- CRUD operations for products
- Search by name
- Filter by category
- Stock checking
- Auto-seeds initial products on first startup
- Product data stored in PostgreSQL

**Endpoints:**

- `GET /products` - List all products (with filters)
- `GET /products/:id` - Get product details
- `POST /products` - Create product (protected)
- `PUT /products/:id` - Update product (protected)
- `DELETE /products/:id` - Delete product (protected)
- `GET /products/:id/stock` - Check stock availability

**Database:** PostgreSQL - `products` table

**Initial Seed Data:**

- Laptop ($999.99, Stock: 50)
- Smartphone ($699.99, Stock: 100)
- Wireless Mouse ($29.99, Stock: 200)

---

### 4. Cart Service (Port 3003)

**Purpose:** Shopping cart management

**Features:**

- Add items to cart
- Update quantities
- Remove items
- Clear cart
- Cart totals calculation
- Integrates with Product Service
- Cart data stored in Redis (24h expiration)

**Endpoints:**

- `GET /cart` - Get user's cart (protected)
- `POST /cart/items` - Add item to cart (protected)
- `PUT /cart/items/:productId` - Update quantity (protected)
- `DELETE /cart/items/:productId` - Remove item (protected)
- `DELETE /cart` - Clear cart (protected)

**Database:** Redis - Key pattern: `cart:{userId}`

---

### 5. Order Service (Port 3004)

**Purpose:** Order processing and management

**Features:**

- Create orders from cart
- Order history
- Order status management
- Order cancellation (with validation)
- Integrates with Cart and Product services
- Publishes events to RabbitMQ
- Order data stored in PostgreSQL

**Endpoints:**

- `POST /orders` - Create order (checkout) (protected)
- `GET /orders` - Get user's orders (protected)
- `GET /orders/:id` - Get order details (protected)
- `PUT /orders/:id/status` - Update status (admin)
- `POST /orders/:id/cancel` - Cancel order (protected)

**Database:** PostgreSQL - `orders` and `order_items` tables

**Order Statuses:**

- `PENDING` - Initial state
- `PROCESSING` - Being prepared
- `SHIPPED` - In transit
- `DELIVERED` - Completed
- `CANCELLED` - Cancelled by user/admin

**RabbitMQ Events:**

- `order_created` - New order placed
- `order_status_updated` - Status changed
- `order_cancelled` - Order cancelled

---

## 📖 API Documentation

### Authentication

**Public Endpoints (No Auth):**

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/products`
- `GET /api/products/:id`

**Protected Endpoints (JWT Required):**

- All other endpoints require JWT token in header

**Header Format:**

```
Authorization: Bearer <jwt-token>
```

**Token Expiry:** 24 hours

### Example API Calls

**1. Register User:**

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

**Response:**

```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**2. Get Products:**

```bash
curl http://localhost:3000/api/products
```

**3. Add to Cart:**

```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "productId": "product-uuid",
    "quantity": 2
  }'
```

**4. Create Order:**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🗄️ Database Schema

### Users Table (PostgreSQL)

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### Products Table (PostgreSQL)

```sql
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  stock       INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### Orders Table (PostgreSQL)

```sql
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           VARCHAR(255) NOT NULL,
  total             DECIMAL(10,2) NOT NULL,
  status            VARCHAR(50) DEFAULT 'PENDING',
  shipping_address  JSONB NOT NULL,
  payment_method    VARCHAR(50) NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id  VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  quantity    INTEGER NOT NULL
);
```

### Cart Data (Redis)

```
Key: cart:{userId}
Value: JSON string
{
  "userId": "user-123",
  "items": [
    {
      "productId": "prod-uuid",
      "name": "Product Name",
      "price": 99.99,
      "quantity": 2,
      "subtotal": 199.98
    }
  ],
  "total": 199.98,
  "itemCount": 2
}
Expiry: 24 hours
```

---

## 🐳 Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Start with rebuild
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View running containers
docker-compose ps
docker ps

# View logs
docker-compose logs
docker-compose logs -f              # Follow logs
docker-compose logs user-service    # Specific service
```

### Building & Rebuilding

```bash
# Rebuild specific service
docker-compose build user-service

# Rebuild all services
docker-compose build

# Rebuild without cache (clean build)
docker-compose build --no-cache

# Rebuild and restart specific service
docker-compose up -d --build user-service
```

### Scaling Services

```bash
# Scale product service to 3 instances
docker-compose up -d --scale product-service=3

# Check scaled instances
docker ps | grep product-service
```

### Debugging

```bash
# Execute command in container
docker exec -it user-service sh

# View container logs
docker logs user-service

# Inspect container
docker inspect user-service

# Check resource usage
docker stats

# View networks
docker network ls
docker network inspect ecommerce-microservices_ecommerce-network

# View volumes
docker volume ls
docker volume inspect ecommerce-microservices_postgres_data
```

### Database Access

```bash
# Access PostgreSQL
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce

# PostgreSQL commands (inside psql):
\dt                     # List tables
\d users                # Describe users table
SELECT * FROM users;    # Query data
\q                      # Quit

# Access Redis
docker exec -it ecommerce-redis redis-cli

# Redis commands:
KEYS *                  # List all keys
GET cart:user123        # Get cart data
FLUSHALL                # Clear all data
exit                    # Exit
```

### Cleanup

```bash
# Remove all containers, networks, volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a

# Remove specific volume
docker volume rm ecommerce-microservices_postgres_data
```

---

## 💻 Development

### Local Development (Without Docker)

**Prerequisites:**

- PostgreSQL 15 running locally
- Redis running locally
- RabbitMQ running locally

**Option: Use Docker for databases only:**

```bash
# Start only databases
docker-compose up postgres redis rabbitmq -d

# Run services locally
cd services/user-service
npm install
npm run dev

# In separate terminals
cd services/product-service && npm install && npm run dev
cd services/cart-service && npm install && npm run dev
cd services/order-service && npm install && npm run dev
cd services/api-gateway && npm install && npm run dev
```

### Adding New Service

1. Create service directory: `services/new-service/`
2. Add `package.json`, `tsconfig.json`, `Dockerfile`
3. Add Prisma if using PostgreSQL
4. Add to `docker-compose.yml`
5. Update API Gateway routes
6. Update this README

### Running Tests

```bash
# Run tests for specific service
cd services/user-service
npm test

# Run all tests (if implemented)
npm run test:all
```

### Database Migrations

```bash
# Create new migration
cd services/user-service
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset
```

---

## 🚀 Production Deployment

### Docker Compose (Single Server)

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### Kubernetes (Scalable)

1. Create Kubernetes manifests from Docker Compose
2. Use Helm charts for deployment
3. Configure Ingress for external access
4. Set up persistent volumes
5. Configure secrets management

### Cloud Platforms

**AWS:**

- ECS (Elastic Container Service)
- EKS (Elastic Kubernetes Service)
- RDS (PostgreSQL)
- ElastiCache (Redis)
- Amazon MQ (RabbitMQ)

**Google Cloud:**

- Cloud Run
- GKE (Google Kubernetes Engine)
- Cloud SQL (PostgreSQL)
- Memorystore (Redis)
- Cloud Pub/Sub

**Azure:**

- Container Instances
- AKS (Azure Kubernetes Service)
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Service Bus

### Production Checklist

- [ ] Update all secrets in `.env`
- [ ] Use managed databases (RDS, Cloud SQL)
- [ ] Set up SSL/TLS certificates
- [ ] Configure domain and DNS
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure logging (ELK stack, CloudWatch)
- [ ] Implement backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Configure auto-scaling
- [ ] Implement health checks and readiness probes
- [ ] Set up alerting
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Implement API versioning
- [ ] Set up distributed tracing

---

## 🔧 Troubleshooting

### Services Won't Start

```bash
# Check if ports are already in use
lsof -i :3000
lsof -i :3001
lsof -i :5432

# View detailed logs
docker-compose logs

# Restart with clean slate
docker-compose down -v
docker-compose up --build
```

### Database Connection Errors

```bash
# Check if PostgreSQL is healthy
docker-compose ps

# Wait for health checks
docker-compose up -d
sleep 15
docker-compose logs postgres

# Manually check connection
docker exec -it ecommerce-postgres psql -U postgres -c "SELECT 1"
```

### Prisma Client Errors

```bash
# Regenerate Prisma Client
cd services/user-service
npx prisma generate

# Rebuild Docker image
docker-compose build --no-cache user-service
docker-compose up -d user-service
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Volume Permission Issues

```bash
# Remove volumes and recreate
docker-compose down -v
docker-compose up -d
```

### "Cannot connect to Docker daemon"

```bash
# Ensure Docker Desktop is running
# On Windows: Check WSL2 integration is enabled
# On Linux: Start Docker service
sudo systemctl start docker
```

---

## 📝 Project Structure

```
ecommerce-microservices/
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   ├── user-service/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   ├── product-service/
│   ├── cart-service/
│   └── order-service/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Authors

- Pranit Chavan - Initial work

---

## 🙏 Acknowledgments

- Inspired by modern microservices architectures
- Built with industry best practices
- Docker containerization for consistency
- Prisma for type-safe database access

---

## 📞 Support

For issues and questions:

- Create an issue on GitHub
- Check existing issues and discussions
- Review troubleshooting section above

---

## 🔗 Links

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

---
