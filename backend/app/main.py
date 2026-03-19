"""
Spec10x Backend — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api import (
    auth,
    users,
    interviews,
    themes,
    insights,
    ask,
    export,
    billing,
    websocket,
    demo,
    notifications,
    feed,
    sources,
    survey_import,
)

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.app_env == "development" else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("🚀 Spec10x Backend starting...")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Database: {settings.database_url.split('@')[-1]}")
    yield
    logger.info("👋 Spec10x Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Spec10x API",
    description="Interview Intelligence Platform — Upload interviews, get AI-powered insights",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(themes.router)
app.include_router(insights.router)
app.include_router(ask.router)
app.include_router(export.router)
app.include_router(billing.router)
app.include_router(websocket.router)
app.include_router(demo.router)
app.include_router(notifications.router)
app.include_router(feed.router)
app.include_router(sources.router)
app.include_router(survey_import.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/")
async def root():
    """Root endpoint — API information."""
    return {
        "app": "Spec10x API",
        "version": "0.1.0",
        "docs": "/docs",
    }
