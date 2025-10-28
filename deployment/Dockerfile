# Production Dockerfile for Fixzit Souq Enterprise Platform
# Multi-stage build: builder stage + production stage

# ==================== BUILDER STAGE ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (needed for native modules and TypeScript compilation)
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
COPY pnpm-lock.yaml* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript and Next.js application
RUN pnpm run build

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS production

WORKDIR /app

# Install only runtime dependencies (cairo for PDF generation, etc.)
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install ONLY production dependencies
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copy built artifacts from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Copy other runtime files
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components

# Create uploads directory (MUST be mounted as Docker volume in docker-compose.yml)
# WARNING: Data in this directory will be lost on container restart unless volume-mounted
RUN mkdir -p uploads && \
    echo "⚠️  IMPORTANT: Mount /app/uploads as a Docker volume to persist uploaded files" > uploads/README.txt

# Set proper permissions
RUN chown -R node:node /app
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { \
    res.statusCode === 200 ? process.exit(0) : process.exit(1) \
  }).on('error', () => process.exit(1))"

# Expose port (Next.js default is 3000, not 5000)
EXPOSE 3000

# Start Next.js application in production mode
CMD ["pnpm", "start"]