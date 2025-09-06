# TruffleHog Secret Detection

## Purpose
TruffleHog prevents accidental commits of API keys, tokens, and sensitive credentials through automated scanning.

## How It Works
- **Pre-commit Hook**: Scans staged changes before each commit using Docker
- **GitHub Actions**: Validates all PRs and pushes to main branches
- **Verified Results**: Only fails on confirmed secrets to minimize false positives

## Key Files
```
.githooks/pre-commit          # Local pre-commit validation
.github/workflows/trufflehog.yml  # CI/CD scanning workflow  
.trufflehog-ignore           # False positive patterns
```

## Usage

### Automatic Scanning
TruffleHog runs automatically on:
- Every local commit (if git hooks configured)
- All pull requests
- Pushes to main, develop, and feature branches

### Manual Scanning
```bash
# Scan entire repository
docker run --rm -v "$(pwd):/workdir" \
  trufflesecurity/trufflehog:latest \
  filesystem /workdir --results=verified

# Setup git hooks (one-time)
git config core.hooksPath .githooks
```

## When Secrets Are Detected

### Remediation Steps
1. **Remove the secret** from your code
2. **Move to environment variable**:
   ```javascript
   // Before: const apiKey = "sk-abc123def456";
   // After:  const apiKey = process.env.API_KEY;
   ```
3. **Add to `.env.example`** with placeholder value
4. **Rotate the secret** if it was previously committed

### False Positives
Add patterns to `.trufflehog-ignore`:
```
# Example patterns
*.test.js           # Test files
docs/examples/      # Example code
specific-file.js    # Individual files
```

## Requirements
- Docker (for local scanning)
- Git hooks configured: `git config core.hooksPath .githooks`

## Benefits
- **Dual Protection**: Local hooks + CI/CD validation
- **Developer Friendly**: Clear error messages and remediation guidance
- **Low Maintenance**: Automated scanning with minimal false positives
- **Security Compliance**: Prevents credential leaks before they reach the repository