FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables (required for Next.js build)
ARG JWT_SECRET
ARG MONGODB_URI
ARG NODE_ENV=production
ENV JWT_SECRET=${JWT_SECRET}
ENV MONGODB_URI=${MONGODB_URI}
ENV NODE_ENV=${NODE_ENV}

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
