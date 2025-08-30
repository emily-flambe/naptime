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

# Add build timestamp and git info as build args
ARG BUILD_TIMESTAMP
ARG GIT_COMMIT
ARG GIT_BRANCH

# Set environment variables for build info
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}

# Install backend dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY src/ ./src/

# Copy built frontend to serve statically
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create build info file for runtime access
RUN echo "{" > build-info.json && \
    echo "  \"buildTimestamp\": \"${BUILD_TIMESTAMP}\"," >> build-info.json && \
    echo "  \"gitCommit\": \"${GIT_COMMIT}\"," >> build-info.json && \
    echo "  \"gitBranch\": \"${GIT_BRANCH}\"," >> build-info.json && \
    echo "  \"nodeVersion\": \"$(node --version)\"," >> build-info.json && \
    echo "  \"npmVersion\": \"$(npm --version)\"" >> build-info.json && \
    echo "}" >> build-info.json

# Expose port (Cloud Run sets PORT environment variable)
EXPOSE 8080

# Start the Node.js application
CMD ["npm", "start"]