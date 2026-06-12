.DEFAULT_GOAL := help

NPM ?= npm
UV ?= uv

.PHONY: help setup dev dev-web dev-api test test-api lint lint-web lint-api \
	format format-check build build-web migrate migration-check docker-build \
	docker-up docker-down

help:
	@echo "Discipline App - Milestone 6 commands"
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
	@echo "  make docker-build Build the backend image"
	@echo "  make docker-up    Run the backend container"
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
	cd apps/api && $(UV) run pytest

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
	cd apps/api && $(UV) run alembic upgrade head

migration-check:
	cd apps/api && $(UV) run alembic check

docker-build:
	docker compose build api

docker-up:
	docker compose up --build api

docker-down:
	docker compose down
