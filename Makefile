# ==============================================================================
# TRACEGUARD — Master Makefile
# Web Privacy & Security Intelligence Platform
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Detect Python binary
ifeq ($(OS),Windows_NT)
	PYTHON := apps/api/.venv/Scripts/python.exe
	PNPM := pnpm.cmd
else
	PYTHON := $(shell which apps/api/.venv/bin/python 2>/dev/null || which python3 || which python)
	PNPM := pnpm
endif

.PHONY: help dev dev-api dev-dashboard test test-api test-all lint typecheck build migrate seed demo reset docker-up docker-down

help: ## Show this help message
	@echo "TraceGuard Master Makefile"
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

dev: ## Run FastAPI backend (:8000) and Next.js dashboard (:3000) concurrently
	node scripts/dev.mjs

dev-api: ## Run FastAPI backend independently on port 8000
	node scripts/dev-api.mjs

dev-dashboard: ## Run Next.js web dashboard independently on port 3000
	$(PNPM) --filter @traceguard/dashboard dev

test: ## Run TypeScript Vitest suite (144 tests)
	$(PNPM) test

test-api: ## Run Python FastAPI pytest suite (18 tests)
	node scripts/test-api.mjs

test-all: ## Run complete Vitest and Pytest test suites sequentially
	node scripts/test-all.mjs

lint: ## Run TypeScript and Python linters
	$(PNPM) lint
	@echo "Lint complete."

typecheck: ## Run TypeScript compiler typecheck across all workspace packages
	$(PNPM) -r run typecheck

build: ## Build Chrome Extension and Next.js Web Dashboard production bundles
	$(PNPM) -r run build

migrate: ## Apply Alembic database migrations
	node scripts/migrate.mjs

seed: ## Seed tracker rules and domain catalogs
	node scripts/seed.mjs

demo: ## Populate demo account (demo@traceguard.local) with 4 deterministic website scans
	node scripts/demo.mjs

reset: ## Reset development database, apply migrations, and seed demo records
	node scripts/reset.mjs

docker-up: ## Start full container stack (PostgreSQL, FastAPI, Next.js Dashboard)
	docker compose up -d --build

docker-down: ## Stop container stack
	docker compose down
