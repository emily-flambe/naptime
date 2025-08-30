# Multi-stage build for efficient container
FROM node:20-slim AS frontend-builder

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Node.js backend stage
FROM node:20-slim

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY src/ ./src/

# Copy built frontend to serve statically
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Cloud Run sets PORT environment variable)
EXPOSE 8080

# Start the Node.js application
CMD ["npm", "start"]