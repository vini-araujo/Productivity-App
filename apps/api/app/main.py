"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.system import router as system_router
from app.modules.tasks.router import router as tasks_router
from app.modules.users.router import router as users_router
from app.modules.workouts.router import router as workouts_router


def create_app() -> FastAPI:
    """Create and configure the Discipline App API."""
    application = FastAPI(
        title="Discipline App API",
        description="API for the Discipline App modular monolith.",
        version="0.1.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(system_router)
    application.include_router(users_router)
    application.include_router(tasks_router)
    application.include_router(workouts_router)
    return application


app = create_app()
