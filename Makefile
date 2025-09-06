# Makefile for Google Cloud Run Hello World App

# Load environment variables from .env file if it exists
-include .env
export

# Configuration (can be overridden by .env or command line)
PROJECT_ID ?= $(or $(GCP_PROJECT_ID),your-project-id)
REGION ?= $(or $(GCP_REGION),us-central1)
SERVICE_NAME ?= $(or $(GCP_SERVICE_NAME),oura-naptime)
ARTIFACT_REGISTRY_LOCATION ?= us-central1
ARTIFACT_REGISTRY_REPO ?= cloud-run-apps
IMAGE_NAME = $(ARTIFACT_REGISTRY_LOCATION)-docker.pkg.dev/$(PROJECT_ID)/$(ARTIFACT_REGISTRY_REPO)/$(SERVICE_NAME)
PORT = 8080
BACKEND_PORT = 8080
FRONTEND_PORT = 5173

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Node.js command detection
NODE := $(shell command -v node 2> /dev/null)
NPM := $(shell command -v npm 2> /dev/null)

.PHONY: help
help: ## Show available commands
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)   Naptime - Web App Starter Pack$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo ""
	@echo "$(GREEN)Setup & Installation:$(NC)"
	@echo "  $(GREEN)make init$(NC)         - Interactive setup for .env file"
	@echo "  $(GREEN)make install$(NC)      - Install all dependencies"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  $(GREEN)make dev$(NC)          - Run both frontend and backend servers"
	@echo "  $(GREEN)make dev-frontend$(NC) - Run frontend server only (port 5173)"
	@echo "  $(GREEN)make dev-backend$(NC)  - Run backend server only (port 8080)"
	@echo "  $(GREEN)make test-local$(NC)   - Test with Docker locally (port 8080)"
	@echo ""
	@echo "$(GREEN)Quality & Testing:$(NC)"
	@echo "  $(GREEN)make lint$(NC)         - Run linters for both frontend and backend"
	@echo "  $(GREEN)make format$(NC)       - Format code (frontend and backend)"
	@echo "  $(GREEN)make test$(NC)         - Run all tests"
	@echo ""
	@echo "$(GREEN)Security:$(NC)"
	@echo "  $(GREEN)make scan-secrets$(NC) - Scan repository for secrets with TruffleHog"
	@echo "  $(GREEN)make setup-secrets-scanning$(NC) - Set up TruffleHog pre-commit hooks"
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@echo "  $(GREEN)make build$(NC)        - Build Docker image for deployment"
	@echo "  $(GREEN)make deploy$(NC)       - Deploy to Google Cloud Run"
	@echo "  $(GREEN)make logs$(NC)         - View Cloud Run logs (last 50 entries)"
	@echo "  $(GREEN)make tail$(NC)         - Tail all Cloud Run logs in real-time"
	@echo "  $(GREEN)make tail name=XXX$(NC) - Tail specific revision logs (e.g., name=oura-naptime-pr-2-88831149379)"
	@echo "  $(GREEN)make list-revisions$(NC) - List all Cloud Run revisions with URLs"
	@echo "  $(GREEN)make status$(NC)       - Check deployment status"
	@echo "  $(GREEN)make url$(NC)          - Get deployed service URL"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  $(GREEN)make clean$(NC)        - Clean build artifacts and caches"
	@echo "  $(GREEN)make check-env$(NC)    - Verify environment configuration"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  1. Run 'make init' to configure your project"
	@echo "  2. Run 'make install' to install dependencies"
	@echo "  3. Run 'make dev' to start developing"

.PHONY: init
init: ## Interactive setup for environment configuration
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)   Google Cloud Run Project Setup$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo ""
	@if [ -f .env ]; then \
		echo "$(YELLOW)Warning: .env file already exists$(NC)"; \
		read -p "Do you want to overwrite it? (y/N): " confirm; \
		if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
			echo "$(RED)Setup cancelled$(NC)"; \
			exit 0; \
		fi; \
	fi
	@echo "$(GREEN)Let's configure your project...$(NC)"
	@echo ""
	@read -p "Enter your GCP Project ID (e.g., my-project-123): " project_id; \
	read -p "Enter your GCP Region [us-central1]: " region; \
	region=$${region:-us-central1}; \
	read -p "Enter your service name [oura-naptime]: " service_name; \
	service_name=$${service_name:-oura-naptime}; \
	read -p "Enter Artifact Registry location [us-central1]: " ar_location; \
	ar_location=$${ar_location:-us-central1}; \
	read -p "Enter Artifact Registry repository name [cloud-run-apps]: " ar_repo; \
	ar_repo=$${ar_repo:-cloud-run-apps}; \
	read -p "Enter backend port for local development [8000]: " backend_port; \
	backend_port=$${backend_port:-8000}; \
	read -p "Enter frontend port for local development [5173]: " frontend_port; \
	frontend_port=$${frontend_port:-5173}; \
	echo "" > .env; \
	echo "# Google Cloud Configuration" >> .env; \
	echo "GCP_PROJECT_ID=$$project_id" >> .env; \
	echo "GCP_REGION=$$region" >> .env; \
	echo "GCP_SERVICE_NAME=$$service_name" >> .env; \
	echo "" >> .env; \
	echo "# Artifact Registry Configuration" >> .env; \
	echo "ARTIFACT_REGISTRY_LOCATION=$$ar_location" >> .env; \
	echo "ARTIFACT_REGISTRY_REPO=$$ar_repo" >> .env; \
	echo "" >> .env; \
	echo "# Local Development Ports" >> .env; \
	echo "BACKEND_PORT=$$backend_port" >> .env; \
	echo "FRONTEND_PORT=$$frontend_port" >> .env; \
	echo ""; \
	echo "$(GREEN)✓ Configuration saved to .env$(NC)"; \
	echo ""; \
	echo "$(BLUE)Your configuration:$(NC)"; \
	echo "  Project ID: $$project_id"; \
	echo "  Region: $$region"; \
	echo "  Service Name: $$service_name"; \
	echo "  Artifact Registry: $$ar_location/$$ar_repo"; \
	echo "  Backend Port: $$backend_port"; \
	echo "  Frontend Port: $$frontend_port"; \
	echo ""; \
	echo "$(GREEN)Next steps:$(NC)"; \
	echo "  1. Run 'make install' to install dependencies"; \
	echo "  2. Run 'make dev' to start development servers"; \
	echo "  3. Run 'make deploy' to deploy to Cloud Run"

.PHONY: install
install: ## Install all dependencies
	@if [ -z "$(NODE)" ]; then \
		echo "$(RED)Error: Node.js not found. Please install Node.js 18+$(NC)"; \
		exit 1; \
	fi
	@if [ -z "$(NPM)" ]; then \
		echo "$(RED)Error: npm not found. Please install npm$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Installing backend dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

.PHONY: dev
dev: ## Run both development servers with hot reload
	@if [ -z "$(NODE)" ]; then \
		echo "$(RED)Error: Node.js not found$(NC)"; \
		echo "$(YELLOW)Run 'make install' first to set up the environment$(NC)"; \
		exit 1; \
	fi
	@# Check for processes on port 8080 (backend)
	@if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "$(YELLOW)Port 8080 is already in use (backend)$(NC)"; \
		printf "Kill the process? [Y/n]: "; \
		read answer; \
		if [ "$$answer" != "n" ] && [ "$$answer" != "N" ]; then \
			lsof -Pi :8080 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true; \
			echo "$(GREEN)✓ Killed process on port 8080$(NC)"; \
			sleep 1; \
		else \
			echo "$(RED)Cannot start backend - port 8080 is in use$(NC)"; \
			exit 1; \
		fi; \
	fi
	@# Check for processes on port 5173 (frontend)
	@if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "$(YELLOW)Port 5173 is already in use (frontend)$(NC)"; \
		printf "Kill the process? [Y/n]: "; \
		read answer; \
		if [ "$$answer" != "n" ] && [ "$$answer" != "N" ]; then \
			lsof -Pi :5173 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true; \
			echo "$(GREEN)✓ Killed process on port 5173$(NC)"; \
			sleep 1; \
		else \
			echo "$(RED)Cannot start frontend - port 5173 is in use$(NC)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)Starting development servers...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:8080$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop both servers$(NC)"
	@trap 'kill %1 %2' INT; \
	npm run dev & \
	(cd frontend && npm run dev) & \
	wait

.PHONY: dev-frontend
dev-frontend: ## Run frontend development server only
	@# Check for processes on port 5173
	@if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "$(YELLOW)Port 5173 is already in use$(NC)"; \
		printf "Kill the process? [Y/n]: "; \
		read answer; \
		if [ "$$answer" != "n" ] && [ "$$answer" != "N" ]; then \
			lsof -Pi :5173 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true; \
			echo "$(GREEN)✓ Killed process on port 5173$(NC)"; \
			sleep 1; \
		else \
			echo "$(RED)Cannot start frontend - port 5173 is in use$(NC)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)Starting frontend development server...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@cd frontend && npm run dev

.PHONY: dev-backend
dev-backend: ## Run backend development server only
	@if [ -z "$(NODE)" ]; then \
		echo "$(RED)Error: Node.js not found$(NC)"; \
		echo "$(YELLOW)Run 'make install' first to set up the environment$(NC)"; \
		exit 1; \
	fi
	@# Check for processes on port 8080
	@if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "$(YELLOW)Port 8080 is already in use$(NC)"; \
		printf "Kill the process? [Y/n]: "; \
		read answer; \
		if [ "$$answer" != "n" ] && [ "$$answer" != "N" ]; then \
			lsof -Pi :8080 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true; \
			echo "$(GREEN)✓ Killed process on port 8080$(NC)"; \
			sleep 1; \
		else \
			echo "$(RED)Cannot start backend - port 8080 is in use$(NC)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)Starting backend development server...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:8080$(NC)"
	@echo "$(YELLOW)API Docs: http://localhost:8080/api$(NC)"
	@npm run dev

.PHONY: test-local
test-local: build ## Test the Docker container locally
	@echo "$(GREEN)Running Docker container locally...$(NC)"
	@echo "$(YELLOW)Service will be available at: http://localhost:8080$(NC)"
	@docker run -p 8080:8080 --platform linux/amd64 $(IMAGE_NAME)

.PHONY: build
build: ## Build Docker image for deployment
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Set GCP_PROJECT_ID in .env or run: make build PROJECT_ID=your-actual-project-id"; \
		exit 1; \
	fi
	@echo "$(GREEN)Building frontend...$(NC)"
	cd frontend && npm run build
	@echo "$(GREEN)Building Docker image with build info...$(NC)"
	@BUILD_TIMESTAMP=$$(date -u +"%Y-%m-%dT%H:%M:%SZ"); \
	GIT_COMMIT=$$(git rev-parse --short HEAD 2>/dev/null || echo "unknown"); \
	GIT_BRANCH=$$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"); \
	echo "$(YELLOW)Build Info:$(NC)"; \
	echo "  Timestamp: $$BUILD_TIMESTAMP"; \
	echo "  Git Commit: $$GIT_COMMIT"; \
	echo "  Git Branch: $$GIT_BRANCH"; \
	docker build --platform linux/amd64 \
		--build-arg BUILD_TIMESTAMP="$$BUILD_TIMESTAMP" \
		--build-arg GIT_COMMIT="$$GIT_COMMIT" \
		--build-arg GIT_BRANCH="$$GIT_BRANCH" \
		-t $(IMAGE_NAME) .
	@echo "$(GREEN)✓ Build complete$(NC)"

.PHONY: test
test: ## Run all tests
	@echo "$(GREEN)Running frontend tests...$(NC)"
	cd frontend && npm test
	@echo "$(GREEN)Running backend tests...$(NC)"
	@if [ -f backend/test_main.py ]; then \
		cd backend && python -m pytest; \
	else \
		echo "$(YELLOW)No backend tests found$(NC)"; \
	fi
	@echo "$(GREEN)✓ Tests complete$(NC)"

.PHONY: lint
lint: ## Run linters
	@echo "$(GREEN)Running frontend linter...$(NC)"
	cd frontend && npm run lint
	@echo "$(GREEN)Running frontend type check...$(NC)"
	cd frontend && npm run type-check
	@echo "$(GREEN)Running backend linter...$(NC)"
	@if command -v flake8 > /dev/null 2>&1; then \
		cd backend && flake8 . --max-line-length=100; \
	else \
		echo "$(YELLOW)flake8 not installed, skipping Python linting$(NC)"; \
	fi
	@echo "$(GREEN)✓ Linting complete$(NC)"

.PHONY: deploy
deploy: build ## Deploy to Google Cloud Run
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Set GCP_PROJECT_ID in .env or run: make deploy PROJECT_ID=your-actual-project-id"; \
		exit 1; \
	fi
	@echo "$(GREEN)Pushing image to Artifact Registry...$(NC)"
	docker push $(IMAGE_NAME)
	@echo "$(GREEN)Deploying to Cloud Run...$(NC)"
	@if [ -z "$(OURA_API_TOKEN)" ]; then \
		echo "$(YELLOW)Warning: Missing environment variables. Make sure to set:$(NC)"; \
		echo "  OURA_API_TOKEN=$(OURA_API_TOKEN)"; \
		echo "$(YELLOW)Add this to your .env file or export it$(NC)"; \
	fi
	gcloud run deploy $(SERVICE_NAME) \
		--image $(IMAGE_NAME) \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated \
		--port $(PORT) \
		--memory 512Mi \
		--set-env-vars "NODE_ENV=production,OURA_API_TOKEN=$(OURA_API_TOKEN)" \
		--project $(PROJECT_ID)
	@echo "$(GREEN)✓ Deployment complete!$(NC)"
	@echo "$(GREEN)Service URL:$(NC)"
	@gcloud run services describe $(SERVICE_NAME) \
		--platform managed \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--format 'value(status.url)'

.PHONY: format
format: ## Format code for both frontend and backend
	@echo "$(GREEN)Formatting frontend code...$(NC)"
	@cd frontend && npm run format || echo "$(YELLOW)No format script found, skipping frontend formatting$(NC)"
	@echo "$(GREEN)Formatting backend code...$(NC)"
	@if command -v black > /dev/null 2>&1; then \
		cd backend && black .; \
	else \
		echo "$(YELLOW)black not installed, skipping Python formatting$(NC)"; \
		echo "$(YELLOW)Install with: pip install black$(NC)"; \
	fi
	@echo "$(GREEN)✓ Formatting complete$(NC)"

.PHONY: logs
logs: ## View Cloud Run logs
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Run 'make init' to configure your project"; \
		exit 1; \
	fi
	@echo "$(GREEN)Fetching Cloud Run logs...$(NC)"
	@gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE_NAME)" \
		--limit 50 \
		--project $(PROJECT_ID) \
		--format "table(timestamp, textPayload)"

.PHONY: tail
tail: ## Tail Cloud Run service logs in real-time (shows last 2 minutes, refreshes every 3 seconds). Usage: make tail [name=revision-name]
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Run 'make init' to configure your project"; \
		exit 1; \
	fi
	@if [ -n "$(name)" ]; then \
		echo "$(GREEN)Tailing Cloud Run logs for revision: $(name)$(NC)"; \
		FILTER="resource.type=cloud_run_revision AND resource.labels.revision_name=$(name)"; \
	else \
		echo "$(GREEN)Tailing Cloud Run logs for service: $(SERVICE_NAME) (all revisions)$(NC)"; \
		FILTER="resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE_NAME)"; \
	fi; \
	echo "$(YELLOW)Project: $(PROJECT_ID) | Region: $(REGION)$(NC)"; \
	echo "$(BLUE)Refreshing every 3 seconds. Press Ctrl+C to stop...$(NC)"; \
	echo "$(YELLOW)──────────────────────────────────────────────────────────────$(NC)"; \
	while true; do \
		gcloud logging read \
			"$$FILTER AND timestamp>=\"$$(date -u -v-2M '+%Y-%m-%dT%H:%M:%S.000Z')\"" \
			--project=$(PROJECT_ID) \
			--limit=50 \
			--format="value(timestamp.date('%H:%M:%S'),textPayload)" \
			--order=desc 2>/dev/null | head -20; \
		sleep 3; \
		clear; \
		if [ -n "$(name)" ]; then \
			echo "$(GREEN)Tailing Cloud Run logs for revision: $(name)$(NC)"; \
		else \
			echo "$(GREEN)Tailing Cloud Run logs for service: $(SERVICE_NAME) (all revisions)$(NC)"; \
		fi; \
		echo "$(YELLOW)Project: $(PROJECT_ID) | Region: $(REGION)$(NC)"; \
		echo "$(BLUE)Refreshing every 3 seconds. Press Ctrl+C to stop...$(NC)"; \
		echo "$(YELLOW)──────────────────────────────────────────────────────────────$(NC)"; \
	done

.PHONY: list-revisions
list-revisions: ## List all Cloud Run revisions for the service
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Run 'make init' to configure your project"; \
		exit 1; \
	fi
	@echo "$(GREEN)Listing Cloud Run revisions for service: $(SERVICE_NAME)$(NC)"
	@echo "$(YELLOW)Project: $(PROJECT_ID) | Region: $(REGION)$(NC)"
	@echo "$(BLUE)──────────────────────────────────────────────────────────────$(NC)"
	@gcloud run revisions list \
		--service=$(SERVICE_NAME) \
		--region=$(REGION) \
		--project=$(PROJECT_ID) \
		--format="table(name:label='REVISION NAME',metadata.annotations.'run.googleapis.com/urls':label='PREVIEW URL',status.conditions[0].lastTransitionTime.date('%Y-%m-%d %H:%M'):label='DEPLOYED',spec.containerConcurrency:label='CONCURRENCY',status.traffic.percent:label='TRAFFIC %')"
	@echo ""
	@echo "$(GREEN)Tip: Use 'make tail name=<revision-name>' to tail logs for a specific revision$(NC)"

.PHONY: status
status: ## Check deployment status
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Run 'make init' to configure your project"; \
		exit 1; \
	fi
	@echo "$(GREEN)Checking service status...$(NC)"
	@gcloud run services describe $(SERVICE_NAME) \
		--platform managed \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--format "table(status.conditions.type:label=STATUS, status.conditions.status:label=READY)"

.PHONY: url
url: ## Get deployed service URL
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Run 'make init' to configure your project"; \
		exit 1; \
	fi
	@echo "$(GREEN)Service URL:$(NC)"
	@gcloud run services describe $(SERVICE_NAME) \
		--platform managed \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--format 'value(status.url)' || echo "$(RED)Service not deployed yet$(NC)"

.PHONY: clean
clean: ## Clean build artifacts and caches
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	@rm -rf frontend/dist frontend/node_modules/.vite
	@rm -rf node_modules/.cache coverage
	@echo "$(GREEN)✓ Clean complete$(NC)"

.PHONY: check-env
check-env: ## Verify environment configuration
	@echo "$(BLUE)Current Environment Configuration:$(NC)"
	@echo ""
	@if [ -f .env ]; then \
		echo "$(GREEN).env file found$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Configuration:$(NC)"; \
		echo "  Project ID: $(PROJECT_ID)"; \
		echo "  Region: $(REGION)"; \
		echo "  Service Name: $(SERVICE_NAME)"; \
		echo "  Artifact Registry: $(ARTIFACT_REGISTRY_LOCATION)/$(ARTIFACT_REGISTRY_REPO)"; \
		echo "  Image: $(IMAGE_NAME)"; \
		echo ""; \
		if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
			echo "$(RED)⚠ Warning: Using default project ID. Run 'make init' to configure.$(NC)"; \
		fi; \
	else \
		echo "$(RED).env file not found$(NC)"; \
		echo "Run 'make init' to create one"; \
	fi
	@echo ""
	@echo "$(YELLOW)System Check:$(NC)"
	@echo -n "  Python: "; \
	if [ -n "$(PYTHON)" ]; then \
		echo "$(GREEN)✓$(NC) ($(PYTHON))"; \
	else \
		echo "$(RED)✗ Not found$(NC)"; \
	fi
	@echo -n "  pip: "; \
	if [ -n "$(PIP)" ]; then \
		echo "$(GREEN)✓$(NC) ($(PIP))"; \
	else \
		echo "$(YELLOW)⚠ Not found (will try python -m pip)$(NC)"; \
	fi
	@echo -n "  Node.js: "; \
	if command -v node > /dev/null 2>&1; then \
		echo "$(GREEN)✓$(NC) ($$(node --version))"; \
	else \
		echo "$(RED)✗ Not found$(NC)"; \
	fi
	@echo -n "  Docker: "; \
	if command -v docker > /dev/null 2>&1; then \
		echo "$(GREEN)✓$(NC) ($$(docker --version | cut -d' ' -f3 | tr -d ','))"; \
	else \
		echo "$(RED)✗ Not found$(NC)"; \
	fi
	@echo -n "  gcloud: "; \
	if command -v gcloud > /dev/null 2>&1; then \
		echo "$(GREEN)✓$(NC) ($$(gcloud --version | head -n1 | cut -d' ' -f4))"; \
	else \
		echo "$(RED)✗ Not found$(NC)"; \
	fi

################################################################################
# Security & Secret Scanning
################################################################################

.PHONY: scan-secrets
scan-secrets: ## Scan repository for secrets using TruffleHog
	@echo "$(BLUE)🔍 Scanning repository for secrets...$(NC)"
	@echo ""
	@if command -v docker > /dev/null 2>&1; then \
		docker run --rm -v "$$(pwd):/workdir" \
			trufflesecurity/trufflehog:latest \
			filesystem /workdir \
			--results=verified \
			--no-update; \
		if [ $$? -eq 0 ]; then \
			echo ""; \
			echo "$(GREEN)✅ No verified secrets detected$(NC)"; \
		else \
			echo ""; \
			echo "$(RED)⚠️  Secrets detected! Please review and remove them.$(NC)"; \
			exit 1; \
		fi; \
	elif command -v trufflehog > /dev/null 2>&1; then \
		trufflehog filesystem . \
			--results=verified \
			--exclude-paths=.trufflehog-ignore; \
		if [ $$? -eq 0 ]; then \
			echo ""; \
			echo "$(GREEN)✅ No verified secrets detected$(NC)"; \
		else \
			echo ""; \
			echo "$(RED)⚠️  Secrets detected! Please review and remove them.$(NC)"; \
			exit 1; \
		fi; \
	else \
		echo "$(RED)Error: TruffleHog is not installed$(NC)"; \
		echo ""; \
		echo "Install using one of these methods:"; \
		echo "  1. Docker: docker pull trufflesecurity/trufflehog:latest"; \
		echo "  2. Homebrew: brew install trufflehog"; \
		echo "  3. Run: make setup-secrets-scanning"; \
		exit 1; \
	fi

.PHONY: setup-secrets-scanning
setup-secrets-scanning: ## Set up TruffleHog pre-commit hooks for secret detection
	@if [ -f "scripts/setup-trufflehog.sh" ]; then \
		./scripts/setup-trufflehog.sh; \
	else \
		echo "$(RED)Setup script not found$(NC)"; \
		echo "Creating setup script..."; \
		mkdir -p scripts; \
		echo "#!/bin/bash" > scripts/setup-trufflehog.sh; \
		echo "git config core.hooksPath .githooks" >> scripts/setup-trufflehog.sh; \
		chmod +x scripts/setup-trufflehog.sh; \
		./scripts/setup-trufflehog.sh; \
	fi

# Default target
.DEFAULT_GOAL := help