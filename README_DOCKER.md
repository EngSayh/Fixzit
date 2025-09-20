# FIXZIT SOUQ Enterprise - Docker Setup

This guide explains how to run the FIXZIT SOUQ Enterprise system using Docker Compose.

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- Ports 3000, 5000, 27017, 80, 443 available

### Local Development

1. **Clone and navigate to the project:**
   ```bash
   cd /workspace
   ```

2. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start all services:**
   ```bash
   docker compose -f docker-compose.local.yml up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000
   - MongoDB: localhost:27017

### Production Deployment

1. **Set up environment variables:**
   ```bash
   cp .env.example .env.prod
   # Edit .env.prod with production values
   ```

2. **Start production services:**
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

## 📋 Services Overview

### Frontend (Next.js)
- **Container:** `fixzit-frontend`
- **Port:** 3000
- **Health Check:** http://localhost:3000
- **Features:** React 18, Next.js 14, Tailwind CSS, Arabic/English support

### Backend (Node.js/Express)
- **Container:** `fixzit-backend`
- **Port:** 5000
- **Health Check:** http://localhost:5000/health
- **Features:** JWT authentication, REST API, MongoDB integration

### Database (MongoDB)
- **Container:** `fixzit-mongodb`
- **Port:** 27017
- **Features:** Persistent storage, indexes, authentication

### Reverse Proxy (Nginx)
- **Container:** `fixzit-nginx`
- **Ports:** 80, 443
- **Features:** Load balancing, SSL termination, rate limiting

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_ROOT_USERNAME` | MongoDB root username | admin |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | fixzit123 |
| `JWT_SECRET` | JWT signing secret | fixzit_souq_jwt_secret_key_2025_enterprise |
| `JWT_EXPIRES_IN` | JWT token expiration | 7d |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:3000 |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | http://localhost:5000 |

### Docker Compose Files

- **`docker-compose.local.yml`** - Local development setup
- **`docker-compose.prod.yml`** - Production deployment setup

## 🛠️ Development Commands

### Start Services
```bash
# Start all services
docker compose -f docker-compose.local.yml up

# Start in background
docker compose -f docker-compose.local.yml up -d

# Rebuild and start
docker compose -f docker-compose.local.yml up --build
```

### Stop Services
```bash
# Stop all services
docker compose -f docker-compose.local.yml down

# Stop and remove volumes
docker compose -f docker-compose.local.yml down -v
```

### View Logs
```bash
# All services
docker compose -f docker-compose.local.yml logs

# Specific service
docker compose -f docker-compose.local.yml logs frontend
docker compose -f docker-compose.local.yml logs backend
docker compose -f docker-compose.local.yml logs mongodb
```

### Execute Commands
```bash
# Access frontend container
docker compose -f docker-compose.local.yml exec frontend sh

# Access backend container
docker compose -f docker-compose.local.yml exec backend sh

# Access MongoDB
docker compose -f docker-compose.local.yml exec mongodb mongosh
```

## 🔍 Health Checks

### Service Health
```bash
# Check all services
docker compose -f docker-compose.local.yml ps

# Check specific service health
docker inspect fixzit-frontend | grep Health -A 10
docker inspect fixzit-backend | grep Health -A 10
```

### Application Health
```bash
# Frontend health
curl http://localhost:3000

# Backend health
curl http://localhost:5000/health

# API test (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/test
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5000
   
   # Kill processes using ports
   sudo kill -9 $(lsof -t -i:3000)
   sudo kill -9 $(lsof -t -i:5000)
   ```

2. **MongoDB connection issues:**
   ```bash
   # Check MongoDB logs
   docker compose -f docker-compose.local.yml logs mongodb
   
   # Restart MongoDB
   docker compose -f docker-compose.local.yml restart mongodb
   ```

3. **Frontend build issues:**
   ```bash
   # Rebuild frontend
   docker compose -f docker-compose.local.yml build --no-cache frontend
   ```

4. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER /workspace
   ```

### Logs and Debugging

```bash
# Follow logs in real-time
docker compose -f docker-compose.local.yml logs -f

# View specific service logs
docker compose -f docker-compose.local.yml logs -f frontend
docker compose -f docker-compose.local.yml logs -f backend

# Check container status
docker compose -f docker-compose.local.yml ps
```

## 📊 Monitoring

### Resource Usage
```bash
# Check resource usage
docker stats

# Check specific containers
docker stats fixzit-frontend fixzit-backend fixzit-mongodb
```

### Database Monitoring
```bash
# Access MongoDB shell
docker compose -f docker-compose.local.yml exec mongodb mongosh

# Check database status
use fixzit_souq
db.stats()
```

## 🔒 Security

### Production Security Checklist

- [ ] Change default MongoDB credentials
- [ ] Use strong JWT secret
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable MongoDB authentication
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting

### SSL Configuration

1. **Generate SSL certificates:**
   ```bash
   mkdir -p nginx/ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/ssl/key.pem \
     -out nginx/ssl/cert.pem
   ```

2. **Update nginx configuration:**
   - Uncomment HTTPS server block in `nginx/nginx.conf`
   - Update SSL certificate paths

## 🚀 Deployment

### Production Deployment Steps

1. **Prepare environment:**
   ```bash
   cp .env.example .env.prod
   # Edit .env.prod with production values
   ```

2. **Deploy with Docker Compose:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. **Verify deployment:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   curl https://yourdomain.com/health
   ```

### Scaling Services

```bash
# Scale frontend instances
docker compose -f docker-compose.prod.yml up -d --scale frontend=3

# Scale backend instances
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

## 📞 Support

For Docker-related issues:
- Check container logs: `docker compose logs`
- Verify service health: `docker compose ps`
- Review configuration files
- Check port availability
- Verify environment variables

---

*Docker Setup v2.0.26 - FIXZIT SOUQ Enterprise*