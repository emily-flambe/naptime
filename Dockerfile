# Multi-stage build for efficient container
FROM node:20-slim AS frontend-builder

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Python backend stage
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend to serve statically
COPY --from=frontend-builder /app/frontend/dist ./static

# Create a simple script to serve both frontend and API
RUN echo '#!/bin/bash\nuvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}' > /app/start.sh && \
    chmod +x /app/start.sh

# Expose port (Cloud Run sets PORT environment variable)
EXPOSE 8080

# Start the application
CMD ["/app/start.sh"]