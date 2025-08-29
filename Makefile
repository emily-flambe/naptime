# Makefile for Google Cloud Run Hello World App

# Load environment variables from .env file if it exists
-include .env
export

# Configuration (can be overridden by .env or command line)
PROJECT_ID ?= $(or $(GCP_PROJECT_ID),your-project-id)
REGION ?= $(or $(GCP_REGION),us-central1)
SERVICE_NAME ?= $(or $(GCP_SERVICE_NAME),hello-world-app)
ARTIFACT_REGISTRY_LOCATION ?= us-central1
ARTIFACT_REGISTRY_REPO ?= cloud-run-apps
IMAGE_NAME = $(ARTIFACT_REGISTRY_LOCATION)-docker.pkg.dev/$(PROJECT_ID)/$(ARTIFACT_REGISTRY_REPO)/$(SERVICE_NAME)
PORT = 8080

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help
help: ## Show available commands
	@echo "$(GREEN)Available commands:$(NC)"
	@echo "  $(GREEN)make install$(NC)  - Install all dependencies"
	@echo "  $(GREEN)make dev$(NC)      - Run development servers with hot reload"
	@echo "  $(GREEN)make build$(NC)    - Build Docker image for deployment"
	@echo "  $(GREEN)make test$(NC)     - Run all tests"
	@echo "  $(GREEN)make lint$(NC)     - Run linters"
	@echo "  $(GREEN)make deploy$(NC)   - Deploy to Google Cloud Run"

.PHONY: install
install: ## Install all dependencies
	@echo "$(GREEN)Installing backend dependencies...$(NC)"
	cd backend && pip install -r requirements.txt
	@echo "$(GREEN)Installing frontend dependencies...$(NC)"
	cd frontend && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

.PHONY: dev
dev: ## Run development servers with hot reload
	@echo "$(GREEN)Starting development servers...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:8000$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop both servers$(NC)"
	@trap 'kill %1 %2' INT; \
	(cd backend && uvicorn main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

.PHONY: build
build: ## Build Docker image for deployment
	@if [ "$(PROJECT_ID)" = "your-project-id" ]; then \
		echo "$(RED)Error: PROJECT_ID not set$(NC)"; \
		echo "Set GCP_PROJECT_ID in .env or run: make build PROJECT_ID=your-actual-project-id"; \
		exit 1; \
	fi
	@echo "$(GREEN)Building frontend...$(NC)"
	cd frontend && npm run build
	@echo "$(GREEN)Building Docker image...$(NC)"
	docker build --platform linux/amd64 -t $(IMAGE_NAME) .
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
	gcloud run deploy $(SERVICE_NAME) \
		--image $(IMAGE_NAME) \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated \
		--port $(PORT) \
		--memory 512Mi \
		--project $(PROJECT_ID)
	@echo "$(GREEN)✓ Deployment complete!$(NC)"
	@echo "$(GREEN)Service URL:$(NC)"
	@gcloud run services describe $(SERVICE_NAME) \
		--platform managed \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--format 'value(status.url)'

# Default target
.DEFAULT_GOAL := help