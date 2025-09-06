#!/bin/bash
# Setup script for TruffleHog secret detection
# This script configures local git hooks and ensures TruffleHog is available

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "${BLUE}🔧 Setting up TruffleHog secret detection...${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check for Docker or native TruffleHog
TRUFFLEHOG_AVAILABLE=false

if command_exists docker; then
    echo "${GREEN}✓${NC} Docker is installed"
    echo "  Pulling TruffleHog Docker image..."
    docker pull trufflesecurity/trufflehog:latest
    TRUFFLEHOG_AVAILABLE=true
elif command_exists trufflehog; then
    echo "${GREEN}✓${NC} TruffleHog is installed natively"
    TRUFFLEHOG_AVAILABLE=true
else
    echo "${YELLOW}⚠️  Neither Docker nor TruffleHog is installed${NC}"
    echo ""
    echo "Please install one of the following:"
    echo ""
    echo "Option 1: Docker Desktop (Recommended)"
    echo "  Visit: https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Option 2: TruffleHog via Homebrew"
    echo "  Run: brew install trufflehog"
    echo ""
    echo "Option 3: TruffleHog via install script"
    echo "  Run: curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin"
    echo ""
    read -p "Would you like to continue setup anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Set up git hooks
echo ""
echo "${BLUE}Configuring Git hooks...${NC}"

if [ -d ".githooks" ]; then
    # Configure git to use our hooks directory
    git config core.hooksPath .githooks
    echo "${GREEN}✓${NC} Git hooks configured to use .githooks directory"
    
    # Make sure the pre-commit hook is executable
    if [ -f ".githooks/pre-commit" ]; then
        chmod +x .githooks/pre-commit
        echo "${GREEN}✓${NC} Pre-commit hook is executable"
    else
        echo "${RED}✗${NC} Pre-commit hook not found at .githooks/pre-commit"
        exit 1
    fi
else
    echo "${RED}✗${NC} .githooks directory not found"
    echo "  Creating hooks directory and copying template..."
    mkdir -p .githooks
    
    # Create a basic pre-commit hook if it doesn't exist
    if [ ! -f ".githooks/pre-commit" ]; then
        cp scripts/templates/pre-commit .githooks/pre-commit 2>/dev/null || \
        echo "Please create .githooks/pre-commit manually"
    fi
    
    chmod +x .githooks/pre-commit
    git config core.hooksPath .githooks
fi

# Test the setup
echo ""
echo "${BLUE}Testing setup...${NC}"

if [ "$TRUFFLEHOG_AVAILABLE" = true ]; then
    # Create a temporary file with a fake secret for testing
    TEMP_FILE=$(mktemp)
    echo "test_api_key = 'sk-1234567890abcdef1234567890abcdef'" > "$TEMP_FILE"
    
    # Test TruffleHog scanning
    if command_exists docker; then
        docker run --rm -v "$(pwd):/workdir" \
            trufflesecurity/trufflehog:latest \
            filesystem /workdir \
            --no-verification \
            --no-update \
            --quiet 2>/dev/null || true
    else
        trufflehog filesystem . --no-verification --quiet 2>/dev/null || true
    fi
    
    rm "$TEMP_FILE"
    echo "${GREEN}✓${NC} TruffleHog test completed successfully"
fi

# Summary
echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}✅ Setup complete!${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "TruffleHog will now scan for secrets:"
echo "  • Before each commit (local hook)"
echo "  • On all pull requests (GitHub Actions)"
echo "  • On pushes to main branch (GitHub Actions)"
echo ""
echo "Available commands:"
echo "  ${BLUE}make scan-secrets${NC}     - Manually scan entire repository"
echo "  ${BLUE}make help${NC}            - Show all available commands"
echo ""
echo "If you encounter false positives, add patterns to:"
echo "  • .trufflehog-ignore"
echo ""
echo "For more information, see:"
echo "  • .project/docs/plans/trufflehog-implementation.md"