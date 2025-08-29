#!/bin/bash

# Simple deployment script for Google Cloud Run

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration (environment variables or defaults)
PROJECT_ID=${PROJECT_ID:-${GOOGLE_PROJECT_ID:-"your-project-id"}}
REGION=${REGION:-${GOOGLE_REGION:-"us-central1"}}
SERVICE_NAME=${SERVICE_NAME:-"hello-world-app"}
# Use Artifact Registry (Container Registry deprecated March 2025)
ARTIFACT_REGISTRY_LOCATION=${ARTIFACT_REGISTRY_LOCATION:-"us-central1"}
ARTIFACT_REGISTRY_REPO=${ARTIFACT_REGISTRY_REPO:-"cloud-run-apps"}
IMAGE_NAME="${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to Google Cloud Run...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if PROJECT_ID is set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${YELLOW}Warning: PROJECT_ID not set${NC}"
    echo "Please set your project ID:"
    echo "  export PROJECT_ID=your-actual-project-id"
    echo "Or run:"
    echo "  PROJECT_ID=your-actual-project-id ./deploy.sh"
    exit 1
fi

# Set the project
echo -e "${GREEN}Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${GREEN}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry repository if it doesn't exist
echo -e "${GREEN}Creating Artifact Registry repository if needed...${NC}"
gcloud artifacts repositories describe ${ARTIFACT_REGISTRY_REPO} \
    --location=${ARTIFACT_REGISTRY_LOCATION} \
    --project=${PROJECT_ID} >/dev/null 2>&1 || \
gcloud artifacts repositories create ${ARTIFACT_REGISTRY_REPO} \
    --repository-format=docker \
    --location=${ARTIFACT_REGISTRY_LOCATION} \
    --description="Docker repository for Cloud Run apps" \
    --project=${PROJECT_ID}

# Configure Docker authentication for Artifact Registry
echo -e "${GREEN}Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev

# Build the Docker image
echo -e "${GREEN}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

# Push to Container Registry
echo -e "${GREEN}Pushing image to Container Registry...${NC}"
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${GREEN}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)')

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"