#!/bin/bash

# Manual cleanup script for orphaned preview environments

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="${PROJECT_ID:-oura-sleep-monitoring}"
REGION="${REGION:-us-central1}"
SERVICE_PREFIX="${SERVICE_PREFIX:-oura-naptime-app-pr-}"
DAYS_OLD="${DAYS_OLD:-7}"
DRY_RUN="${DRY_RUN:-true}"

echo -e "${BLUE}Orphaned Preview Cleanup Script${NC}"
echo "=================================="
echo "Configuration:"
echo "  PROJECT_ID: $PROJECT_ID"
echo "  REGION: $REGION"
echo "  SERVICE_PREFIX: $SERVICE_PREFIX"
echo "  DAYS_OLD: $DAYS_OLD"
echo "  DRY_RUN: $DRY_RUN"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    exit 1
fi

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}Warning: GitHub CLI not found - will delete all old previews regardless of PR status${NC}"
fi

# Find all preview services
echo -e "${YELLOW}Finding preview services...${NC}"
SERVICES=$(gcloud run services list \
    --platform managed \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format="value(name)" | grep "^${SERVICE_PREFIX}" || true)

if [ -z "$SERVICES" ]; then
    echo -e "${GREEN}No preview deployments found${NC}"
    exit 0
fi

echo "Found $(echo "$SERVICES" | wc -l | tr -d ' ') preview services"
echo ""

CLEANUP_COUNT=0
SKIP_COUNT=0

# Process each service
for SERVICE in $SERVICES; do
    echo -e "\n${BLUE}Processing: $SERVICE${NC}"
    
    # Extract PR number
    PR_NUMBER=$(echo "$SERVICE" | sed "s/^${SERVICE_PREFIX}//")
    echo "  PR Number: #$PR_NUMBER"
    
    # Get service creation timestamp
    CREATED=$(gcloud run services describe "$SERVICE" \
        --platform managed \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --format="value(metadata.creationTimestamp)" 2>/dev/null || echo "")
    
    if [ -z "$CREATED" ]; then
        echo -e "  ${YELLOW}Warning: Could not get creation time, skipping${NC}"
        ((SKIP_COUNT++))
        continue
    fi
    
    echo "  Created: $CREATED"
    
    # Calculate age in days using Python
    AGE_DAYS=$(python3 -c "
from datetime import datetime, timezone
created = datetime.fromisoformat('$CREATED'.replace('Z', '+00:00'))
now = datetime.now(timezone.utc)
print((now - created).days)
" 2>/dev/null || echo -1)
    
    if [ "$AGE_DAYS" -eq -1 ]; then
        echo -e "  ${YELLOW}Warning: Could not calculate age, skipping${NC}"
        ((SKIP_COUNT++))
        continue
    fi
    
    echo "  Age: $AGE_DAYS days"
    
    # Check if old enough for cleanup
    if [ "$AGE_DAYS" -gt "$DAYS_OLD" ]; then
        # Check PR status if gh is available
        if command -v gh &> /dev/null; then
            PR_STATE=$(gh pr view "$PR_NUMBER" --json state --jq .state 2>/dev/null || echo "unknown")
            echo "  PR Status: $PR_STATE"
            
            if [ "$PR_STATE" = "OPEN" ]; then
                echo -e "  ${YELLOW}Skipping - PR is still open${NC}"
                ((SKIP_COUNT++))
                continue
            fi
        fi
        
        if [ "$DRY_RUN" = "true" ]; then
            echo -e "  ${GREEN}[DRY RUN] Would delete this service${NC}"
            ((CLEANUP_COUNT++))
        else
            echo -e "  ${RED}Deleting service...${NC}"
            if gcloud run services delete "$SERVICE" \
                --platform managed \
                --region "$REGION" \
                --project "$PROJECT_ID" \
                --quiet; then
                echo -e "  ${GREEN}Successfully deleted${NC}"
                ((CLEANUP_COUNT++))
            else
                echo -e "  ${RED}Failed to delete${NC}"
                ((SKIP_COUNT++))
            fi
        fi
    else
        echo -e "  ${GREEN}Keeping - only $AGE_DAYS days old${NC}"
        ((SKIP_COUNT++))
    fi
done

# Summary
echo -e "\n${BLUE}Summary:${NC}"
echo "  Services processed: $(echo "$SERVICES" | wc -l | tr -d ' ')"
echo "  Cleaned up: $CLEANUP_COUNT"
echo "  Skipped: $SKIP_COUNT"

if [ "$DRY_RUN" = "true" ]; then
    echo -e "\n${YELLOW}This was a DRY RUN. To actually delete services, run:${NC}"
    echo "  DRY_RUN=false $0"
fi