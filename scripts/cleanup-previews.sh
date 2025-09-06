#!/bin/bash

# cleanup-previews.sh - Clean up Google Cloud Run preview deployments
# Usage:
#   ./cleanup-previews.sh --list                    # List all preview deployments
#   ./cleanup-previews.sh --dry-run                 # Show what would be deleted
#   ./cleanup-previews.sh --all                     # Delete all preview deployments
#   ./cleanup-previews.sh --older-than N            # Delete previews older than N days
#   ./cleanup-previews.sh --pr NUMBER               # Delete specific PR preview

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-""}
SERVICE_PREFIX="oura-naptime-pr-"
REGION=${GCP_REGION:-"us-central1"}
ARTIFACT_REGISTRY_LOCATION=${GCP_ARTIFACT_REGISTRY_LOCATION:-"us-central1"}
ARTIFACT_REGISTRY_REPO=${GCP_ARTIFACT_REGISTRY_REPO:-"cloud-run-apps"}

# Command line arguments
ACTION=""
DAYS_OLD=7
PR_NUMBER=""
DRY_RUN=false

# Function to print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --list                List all preview deployments"
    echo "  --dry-run             Show what would be deleted (works with --all or --older-than)"
    echo "  --all                 Delete all preview deployments"
    echo "  --older-than N        Delete previews older than N days (default: 7)"
    echo "  --pr NUMBER           Delete specific PR preview"
    echo "  --help                Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  GCP_PROJECT_ID        Google Cloud Project ID (required)"
    echo "  GCP_REGION            Google Cloud Region (default: us-central1)"
    exit 1
}

# Function to check prerequisites
check_prerequisites() {
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: GCP_PROJECT_ID environment variable is not set${NC}"
        echo "Please set it with: export GCP_PROJECT_ID=your-project-id"
        exit 1
    fi
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}Error: gcloud CLI is not installed${NC}"
        echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        echo -e "${RED}Error: Not authenticated with gcloud${NC}"
        echo "Please run: gcloud auth login"
        exit 1
    fi
    
    # Set project
    gcloud config set project "$PROJECT_ID" &> /dev/null
}

# Function to list preview services
list_preview_services() {
    echo -e "${BLUE}Listing preview deployments in project ${PROJECT_ID}...${NC}"
    echo ""
    
    local services=$(gcloud run services list \
        --platform managed \
        --region "$REGION" \
        --format="table(name,metadata.creationTimestamp,status.url)" \
        --filter="name:${SERVICE_PREFIX}" \
        2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        echo -e "${YELLOW}No preview deployments found${NC}"
    else
        echo "$services"
    fi
}

# Function to get service age in days
get_service_age_days() {
    local service_name=$1
    local created_timestamp=$(gcloud run services describe "$service_name" \
        --platform managed \
        --region "$REGION" \
        --format="value(metadata.creationTimestamp)" \
        2>/dev/null || echo "")
    
    if [ -n "$created_timestamp" ]; then
        local created_epoch=$(date -d "$created_timestamp" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$created_timestamp" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local age_days=$(( (current_epoch - created_epoch) / 86400 ))
        echo "$age_days"
    else
        echo "0"
    fi
}

# Function to delete a preview service
delete_preview_service() {
    local service_name=$1
    local force=${2:-false}
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would delete service: $service_name${NC}"
        return
    fi
    
    if [ "$force" = true ] || [ "$ACTION" = "all" ]; then
        echo -e "${RED}Deleting service: $service_name${NC}"
        gcloud run services delete "$service_name" \
            --platform managed \
            --region "$REGION" \
            --quiet \
            2>/dev/null || echo -e "${RED}Failed to delete service: $service_name${NC}"
        
        # Also try to clean up container images
        delete_container_images "$service_name"
    else
        read -p "Delete service $service_name? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            delete_preview_service "$service_name" true
        else
            echo -e "${YELLOW}Skipped: $service_name${NC}"
        fi
    fi
}

# Function to delete container images for a service
delete_container_images() {
    local service_name=$1
    local image_prefix="${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${service_name}"
    
    echo -e "${BLUE}Cleaning up container images for $service_name...${NC}"
    
    local images=$(gcloud artifacts docker images list "$image_prefix" \
        --include-tags \
        --format="get(package)" \
        2>/dev/null || echo "")
    
    if [ -n "$images" ]; then
        for image in $images; do
            if [ "$DRY_RUN" = true ]; then
                echo -e "${YELLOW}[DRY RUN] Would delete image: $image${NC}"
            else
                echo "Deleting image: $image"
                gcloud artifacts docker images delete "$image" \
                    --quiet \
                    2>/dev/null || echo "Failed to delete image: $image"
            fi
        done
    fi
}

# Function to delete all preview services
delete_all_previews() {
    echo -e "${RED}Deleting ALL preview deployments...${NC}"
    
    local services=$(gcloud run services list \
        --platform managed \
        --region "$REGION" \
        --format="value(name)" \
        --filter="name:${SERVICE_PREFIX}" \
        2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        echo -e "${YELLOW}No preview deployments found${NC}"
        return
    fi
    
    for service in $services; do
        delete_preview_service "$service" true
    done
    
    echo -e "${GREEN}Cleanup complete!${NC}"
}

# Function to delete previews older than N days
delete_old_previews() {
    echo -e "${BLUE}Finding preview deployments older than $DAYS_OLD days...${NC}"
    
    local services=$(gcloud run services list \
        --platform managed \
        --region "$REGION" \
        --format="value(name)" \
        --filter="name:${SERVICE_PREFIX}" \
        2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        echo -e "${YELLOW}No preview deployments found${NC}"
        return
    fi
    
    local deleted_count=0
    for service in $services; do
        local age_days=$(get_service_age_days "$service")
        
        if [ "$age_days" -gt "$DAYS_OLD" ]; then
            echo -e "${YELLOW}Service $service is $age_days days old${NC}"
            delete_preview_service "$service" true
            ((deleted_count++))
        else
            echo -e "${GREEN}Service $service is only $age_days days old, keeping${NC}"
        fi
    done
    
    if [ "$deleted_count" -eq 0 ]; then
        echo -e "${GREEN}No previews older than $DAYS_OLD days found${NC}"
    else
        echo -e "${GREEN}Deleted $deleted_count preview(s)${NC}"
    fi
}

# Function to delete specific PR preview
delete_pr_preview() {
    local pr_number=$1
    local service_name="${SERVICE_PREFIX}${pr_number}"
    
    echo -e "${BLUE}Looking for preview deployment for PR #$pr_number...${NC}"
    
    if gcloud run services describe "$service_name" \
        --platform managed \
        --region "$REGION" \
        &>/dev/null; then
        delete_preview_service "$service_name" true
        echo -e "${GREEN}Deleted preview for PR #$pr_number${NC}"
    else
        echo -e "${YELLOW}No preview deployment found for PR #$pr_number${NC}"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --list)
            ACTION="list"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --all)
            ACTION="all"
            shift
            ;;
        --older-than)
            ACTION="old"
            DAYS_OLD="$2"
            shift 2
            ;;
        --pr)
            ACTION="pr"
            PR_NUMBER="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Check prerequisites
check_prerequisites

# Execute action
case $ACTION in
    list)
        list_preview_services
        ;;
    all)
        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}[DRY RUN MODE] Showing what would be deleted...${NC}"
        fi
        delete_all_previews
        ;;
    old)
        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}[DRY RUN MODE] Showing what would be deleted...${NC}"
        fi
        delete_old_previews
        ;;
    pr)
        delete_pr_preview "$PR_NUMBER"
        ;;
    *)
        echo -e "${RED}Error: No action specified${NC}"
        usage
        ;;
esac