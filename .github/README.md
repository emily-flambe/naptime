# GitHub Configuration

## CI/CD Documentation

CI/CD workflows and deployment documentation has moved to [CI-CD.md](./CI-CD.md).

## Other GitHub Features

### Copilot Instructions
See [copilot-instructions.md](./copilot-instructions.md) for GitHub Copilot configuration and PR review guidelines.

### Security
- TruffleHog secret scanning on all commits
- Emoji linting to maintain professional codebase
- Pre-commit hooks available via `make setup-secrets-scanning`

### Workflows
All GitHub Actions workflows are located in the `.github/workflows/` directory:
- `deploy-main.yml` - Production deployment
- `deploy-pr.yml` - PR validation and preview environments  
- `emoji-lint.yml` - Emoji detection and prevention
- `trufflehog.yml` - Secret scanning