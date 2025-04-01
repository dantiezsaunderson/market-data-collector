# Dockerfile for Market Data Collector application
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install production dependencies for server
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy built files from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/netlify ./netlify

# Install additional dependencies for server functionality
RUN npm install express cors helmet compression firebase-admin node-cron nodemailer

# Copy server file
COPY server.js .
COPY .env* ./

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
