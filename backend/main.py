from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db import init_client, close_client
from routes import router as api_router

# Import centralized logger
from logger_config import get_logger

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting...")
    await init_client()
    yield
    await close_client()
    logger.info("Application shutdown complete")

app = FastAPI(title="Quantum Route Optimization API", lifespan=lifespan)

# CORS (adjust origins if you want to lock it down)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API
app.include_router(api_router, prefix="/api")
