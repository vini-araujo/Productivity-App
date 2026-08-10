.DEFAULT_GOAL := help

NPM ?= npm
UV ?= uv
API_BASE_URL ?= http://localhost:8000

.PHONY: help setup dev dev-web dev-api test test-api lint lint-web lint-api \
	format format-check build build-web migrate migration-check api-smoke \
	api-smoke-ready docker-build docker-up docker-smoke docker-down

help:
	@echo "Ordyn Life commands"
	@echo ""
	@echo "  make setup        Install locked frontend and backend dependencies"
	@echo "  make dev          Run frontend and backend"
	@echo "  make dev-web      Run the Next.js frontend"
	@echo "  make dev-api      Run the FastAPI backend"
	@echo "  make test         Run all tests"
	@echo "  make lint         Run all linters"
	@echo "  make format       Format project code"
	@echo "  make format-check Check project formatting"
	@echo "  make build        Build the static frontend"
	@echo "  make migrate      Run Alembic migrations"
	@echo "  make migration-check Check live database schema against Alembic metadata"
	@echo "  make api-smoke    Smoke test a running API"
	@echo "  make api-smoke-ready Smoke test a ready API"
	@echo "  make docker-build Build the backend image"
	@echo "  make docker-up    Run the backend container"
	@echo "  make docker-smoke Build, run, and smoke test the backend container"
	@echo "  make docker-down  Stop local containers"

setup:
	cd apps/web && $(NPM) ci
	cd apps/api && $(UV) sync --locked

dev:
	$(MAKE) -j2 dev-web dev-api

dev-web:
	cd apps/web && $(NPM) run dev

dev-api:
	cd apps/api && $(UV) run uvicorn app.main:app --reload --port 8000

test: test-api

test-api:
	cd apps/api && $(UV) run python -m pytest

lint: lint-web lint-api

lint-web:
	cd apps/web && $(NPM) run lint
	cd apps/web && $(NPM) run typecheck

lint-api:
	cd apps/api && $(UV) run ruff check .

format:
	cd apps/web && $(NPM) run format
	cd apps/api && $(UV) run ruff format .

format-check:
	cd apps/web && $(NPM) run format:check
	cd apps/api && $(UV) run ruff format --check .

build: build-web

build-web:
	cd apps/web && $(NPM) run build

migrate:
	cd apps/api && $(UV) run python -m alembic upgrade head

migration-check:
	cd apps/api && $(UV) run python -m alembic check

api-smoke:
	cd apps/api && $(UV) run python scripts/smoke_api.py --base-url $(API_BASE_URL)

api-smoke-ready:
	cd apps/api && $(UV) run python scripts/smoke_api.py --base-url $(API_BASE_URL) --require-ready

docker-build:
	docker compose build api

docker-up:
	docker compose up --build api

docker-smoke:
	docker compose up --build --detach api
	cd apps/api && $(UV) run python scripts/smoke_api.py --base-url http://localhost:8000

docker-down:
	docker compose down
