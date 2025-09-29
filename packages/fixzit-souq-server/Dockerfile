FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy source
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]

