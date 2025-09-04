# TruffleHog Secret Detection Implementation Plan

## Executive Summary

Implement TruffleHog secret detection to prevent accidental commits of secrets, API keys, and sensitive credentials to the repository. This plan provides a SIMPLE, effective approach using both local pre-commit hooks and GitHub Actions CI/CD validation.

## Goals

1. **Primary Goal**: Prevent secrets from ever being committed to the repository
2. **Secondary Goal**: Catch any secrets that bypass local hooks via CI/CD scanning
3. **Simplicity**: Keep implementation straightforward and maintainable
4. **Developer Experience**: Minimal friction for developers while maintaining security

## Implementation Strategy

### Phase 1: GitHub Actions (Immediate Protection)
Start with GitHub Actions for immediate protection without requiring developer setup.

### Phase 2: Local Pre-Commit Hooks (Developer Protection)
Add local hooks to catch secrets before they leave developer machines.

### Phase 3: Documentation & Training
Ensure all developers understand the system and how to handle detected secrets.

## Technical Implementation

### 1. GitHub Actions Workflow

Create `.github/workflows/trufflehog.yml`:

```yaml
name: TruffleHog Secret Scan

on:
  push:
    branches:
      - main
      - develop
  pull_request:

jobs:
  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for better detection
          
      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          # Only fail on verified secrets to reduce false positives
          extra_args: --results=verified --fail
```

**Benefits:**
- Runs automatically on all PRs and pushes
- No developer setup required
- Centralized configuration
- Blocks merges if secrets detected

### 2. Local Pre-Commit Hook (Simple Version)

#### Option A: Using pre-commit framework (Recommended)

Install pre-commit:
```bash
npm install --save-dev pre-commit
```

Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: trufflehog
        name: TruffleHog
        description: Detect secrets in your data
        entry: bash -c 'docker run --rm -v "$(pwd):/workdir" -i trufflesecurity/trufflehog:latest git file:///workdir --since-commit HEAD --results=verified --fail'
        language: system
        stages: ["commit"]
```

Add to `package.json`:
```json
{
  "scripts": {
    "prepare": "pre-commit install"
  }
}
```

#### Option B: Direct Git Hook (Simpler but less portable)

Create `.githooks/pre-commit`:
```bash
#!/bin/sh
# TruffleHog pre-commit hook to prevent secrets

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Running TruffleHog secret detection..."

# Run TruffleHog using Docker (most portable)
if command -v docker &> /dev/null; then
    docker run --rm -v "$(pwd):/workdir" -i \
        trufflesecurity/trufflehog:latest \
        git file:///workdir \
        --since-commit HEAD \
        --results=verified \
        --fail
    
    if [ $? -ne 0 ]; then
        echo "${RED}SECRETS DETECTED!${NC}"
        echo "Please remove sensitive information before committing."
        echo "If this is a false positive, add to .trufflehog-ignore"
        exit 1
    fi
else
    echo "${RED}Docker not found. Skipping secret detection.${NC}"
    echo "Install Docker or use 'brew install trufflehog' for native scanning"
fi

echo "${GREEN}No secrets detected. Proceeding with commit.${NC}"
```

Make it executable and configure Git:
```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

### 3. Configuration Files

#### `.trufflehog-ignore` (For false positives)
```
# Add patterns for false positives
# One pattern per line
# Example:
# path/to/test/file.js
# *.test.js
```

#### `.trufflehogignore` (Alternative format)
```yaml
# Paths to ignore
paths:
  - node_modules/
  - coverage/
  - .temp/
  - "*.min.js"

# Specific false positive patterns
allow:
  - "example-api-key-for-docs"
```

### 4. Developer Setup Script

Create `scripts/setup-trufflehog.sh`:
```bash
#!/bin/bash

echo "Setting up TruffleHog secret detection..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is required for TruffleHog. Please install Docker Desktop."
    echo "Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Set up git hooks
if [ -d ".githooks" ]; then
    git config core.hooksPath .githooks
    echo "Git hooks configured successfully!"
else
    echo "Creating git hooks directory..."
    mkdir -p .githooks
    cp scripts/templates/pre-commit .githooks/
    chmod +x .githooks/pre-commit
    git config core.hooksPath .githooks
fi

# Pull TruffleHog Docker image
echo "Pulling TruffleHog Docker image..."
docker pull trufflesecurity/trufflehog:latest

echo "Setup complete! TruffleHog will now scan for secrets before each commit."
```

## Integration with Existing Workflows

### Makefile Integration

Add to `Makefile`:
```makefile
# Secret scanning commands
.PHONY: scan-secrets
scan-secrets: ## Scan entire repository for secrets
	@echo "Scanning for secrets..."
	@docker run --rm -v "$$(pwd):/workdir" \
		trufflesecurity/trufflehog:latest \
		filesystem /workdir \
		--results=verified

.PHONY: setup-secrets-scanning
setup-secrets-scanning: ## Set up TruffleHog pre-commit hooks
	@./scripts/setup-trufflehog.sh
```

### Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "scan:secrets": "docker run --rm -v \"$(pwd):/workdir\" trufflesecurity/trufflehog:latest filesystem /workdir --results=verified",
    "setup:hooks": "git config core.hooksPath .githooks"
  }
}
```

## Handling Secret Detection

### When a Secret is Detected

1. **DO NOT COMMIT** - The pre-commit hook will block the commit
2. **Remove the secret** from your code
3. **Move to environment variable**:
   ```javascript
   // Bad
   const apiKey = "sk-abc123def456";
   
   // Good
   const apiKey = process.env.API_KEY;
   ```
4. **Update `.env.example`** with placeholder
5. **Rotate the exposed secret** if it was previously committed

### False Positives

If TruffleHog detects a false positive:

1. **Verify it's truly a false positive** (not a real secret)
2. **Add to ignore file**:
   - Add file path to `.trufflehog-ignore`
   - Or add pattern to `.trufflehogignore`
3. **Document why** it's a false positive in comments

## Rollout Plan

### Week 1: CI/CD Protection
- [ ] Create and merge GitHub Actions workflow
- [ ] Test on a few PRs
- [ ] Document in README

### Week 2: Developer Tools
- [ ] Add setup script
- [ ] Create pre-commit hooks
- [ ] Update Makefile

### Week 3: Team Enablement
- [ ] Run setup on all developer machines
- [ ] Training session on handling secrets
- [ ] Create troubleshooting guide

## Success Metrics

- **Zero secrets committed** to repository
- **< 5% false positive rate** after tuning
- **100% PR coverage** with GitHub Actions
- **> 80% developer adoption** of pre-commit hooks

## Maintenance

### Regular Tasks
- Update TruffleHog Docker image monthly
- Review and tune false positive patterns
- Audit ignored patterns quarterly
- Update documentation as needed

### Monitoring
- Track secret detection events in GitHub Actions
- Monitor developer feedback on false positives
- Review effectiveness quarterly

## Alternative Considerations

### Why TruffleHog?
- **Most comprehensive**: 800+ secret patterns
- **Active verification**: Can verify if secrets are live
- **Low false positives**: With verified mode
- **Docker support**: Easy, consistent deployment
- **Active development**: Regular updates and improvements

### Alternatives Evaluated
- **git-secrets**: AWS-focused, less comprehensive
- **detect-secrets**: Good but higher false positive rate
- **Gitleaks**: Fast but less verification capability

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives annoy developers | Medium | Use `--results=verified` flag |
| Developers bypass hooks | High | GitHub Actions as backup |
| Performance impact on commits | Low | Docker image cached locally |
| Secrets in git history | High | Separate history scanning project |

## Cost

- **Financial**: $0 (using open source version)
- **Performance**: ~2-5 seconds per commit
- **Developer Time**: ~10 minutes initial setup

## Conclusion

This implementation provides a simple, effective secret detection system with:
1. **Immediate protection** via GitHub Actions
2. **Developer-side prevention** via pre-commit hooks
3. **Minimal complexity** and maintenance burden
4. **Clear path to adoption** with phased rollout

The system prevents secrets from being committed while maintaining developer productivity through smart defaults and clear escape hatches for false positives.