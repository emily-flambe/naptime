#!/bin/bash

# Simpler deployment using gcloud run deploy with source

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration (environment variables or defaults)
PROJECT_ID=${PROJECT_ID:-${GOOGLE_PROJECT_ID:-"your-project-id"}}
REGION=${REGION:-${GOOGLE_REGION:-"us-central1"}}
SERVICE_NAME=${SERVICE_NAME:-"hello-world-app"}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying directly from source using gcloud run deploy...${NC}"

# Check if PROJECT_ID is set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${YELLOW}Warning: PROJECT_ID not set${NC}"
    echo "Please set your project ID:"
    echo "  export PROJECT_ID=your-actual-project-id"
    exit 1
fi

# Deploy directly from source (Cloud Run will build the container)
echo -e "${GREEN}Deploying to Cloud Run (this will build and deploy in one step)...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --source . \
    --project ${PROJECT_ID} \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi

echo -e "${GREEN}Deployment complete!${NC}"