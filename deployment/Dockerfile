# Production Dockerfile for Fixzit Souq Enterprise Platform
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Set proper permissions
RUN chown -R node:node /app
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { \
    res.statusCode === 200 ? process.exit(0) : process.exit(1) \
  }).on('error', () => process.exit(1))"

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "server.js"]