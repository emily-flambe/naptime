#!/bin/bash
# Validate GitHub Actions workflow files before merging

set -e

echo "GitHub Actions Workflow Validator"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
ERRORS=0
WARNINGS=0

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo "Checking for required tools..."

# Check for yamllint
if command_exists yamllint; then
    echo -e "${GREEN}✓${NC} yamllint found"
else
    echo -e "${YELLOW}!${NC} yamllint not found. Install with: pip install yamllint"
    echo "  Skipping YAML syntax validation..."
fi

# Check for actionlint
if command_exists actionlint; then
    echo -e "${GREEN}✓${NC} actionlint found"
else
    echo -e "${YELLOW}!${NC} actionlint not found. Install from: https://github.com/rhysd/actionlint"
    echo "  Skipping GitHub Actions specific validation..."
fi

echo ""

# Find all workflow files
WORKFLOW_FILES=$(find .github/workflows -name '*.yml' -o -name '*.yaml' 2>/dev/null || true)

if [ -z "$WORKFLOW_FILES" ]; then
    echo "No workflow files found in .github/workflows/"
    exit 0
fi

echo "Found workflow files:"
echo "$WORKFLOW_FILES" | while read -r file; do
    echo "  - $file"
done
echo ""

# Validate each workflow file
for file in $WORKFLOW_FILES; do
    echo "Validating: $file"
    echo "-------------------"
    
    # Basic file existence check
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} File not found: $file"
        ((ERRORS++))
        continue
    fi
    
    # YAML syntax validation with yamllint
    if command_exists yamllint; then
        echo -n "  YAML Syntax: "
        if yamllint -d relaxed "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Valid"
        else
            echo -e "${RED}✗${NC} Invalid"
            echo "  Errors:"
            yamllint -d relaxed "$file" 2>&1 | sed 's/^/    /'
            ((ERRORS++))
        fi
    fi
    
    # GitHub Actions specific validation with actionlint
    if command_exists actionlint; then
        echo -n "  GitHub Actions: "
        if actionlint "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Valid"
        else
            echo -e "${RED}✗${NC} Issues found"
            echo "  Issues:"
            actionlint "$file" 2>&1 | sed 's/^/    /'
            ((WARNINGS++))
        fi
    fi
    
    # Check for common issues
    echo "  Common issues check:"
    
    # Check for multi-line Python code that might cause YAML issues
    if grep -q 'python3 -c "' "$file"; then
        MULTILINE_PYTHON=$(grep -n -A5 'python3 -c "' "$file" | grep -E '^[0-9]+-' | wc -l)
        if [ "$MULTILINE_PYTHON" -gt 1 ]; then
            echo -e "    ${YELLOW}!${NC} Multi-line Python code detected (prone to YAML errors)"
            echo "      Consider using single-line format or external scripts"
            ((WARNINGS++))
        else
            echo -e "    ${GREEN}✓${NC} Python code is single-line"
        fi
    fi
    
    # Check for proper indentation in run blocks
    if grep -E '^\s*run:' "$file" > /dev/null; then
        # Check if the line after 'run:' has proper indentation
        if grep -A1 -E '^\s*run:' "$file" | grep -E '^[^\s]' > /dev/null; then
            echo -e "    ${RED}✗${NC} Improper indentation after 'run:' blocks"
            ((ERRORS++))
        else
            echo -e "    ${GREEN}✓${NC} Proper indentation in run blocks"
        fi
    fi
    
    echo ""
done

# Summary
echo "Validation Summary"
echo "=================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All workflows are valid!${NC}"
    exit 0
else
    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    fi
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}! Found $WARNINGS warning(s)${NC}"
    fi
    
    echo ""
    echo "Recommendations:"
    echo "1. Fix all errors before merging"
    echo "2. Consider addressing warnings to improve workflow reliability"
    echo "3. Test workflows in a branch before merging to main"
    echo "4. Use 'act' tool to test workflows locally: https://github.com/nektos/act"
    
    # Exit with error if there were errors
    if [ $ERRORS -gt 0 ]; then
        exit 1
    fi
fi