"""
FastAPI Application for PortofelVirtual Budget Management.

This API provides endpoints for managing personal finances including:
- Transactions (income/expenses)
- Categories
- Investments
- Savings Goals
- Exchange Rates

Also includes AI-friendly endpoints for OpenWebUI integration.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database and routes
from database import init_pool
from routes import (
    auth_router,
    transactions_router,
    categories_router,
    investments_router,
    goals_router,
    wallet_router,
    ai_router,
    admin_router,
    exchange_rates_router,
    api_keys_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database connection pool on startup."""
    init_pool()
    yield
    # Cleanup on shutdown (if needed)


# Create FastAPI app
app = FastAPI(
    title="PortofelVirtual API",
    description="""
## PortofelVirtual Budget Management API

A comprehensive API for managing personal finances.

### Features
- **Transactions**: Track income and expenses with categories
- **Categories**: Organize transactions into custom categories
- **Investments**: Monitor investment portfolio
- **Goals**: Set and track savings goals
- **Exchange Rates**: Multi-currency support
- **AI Integration**: Special endpoints for AI assistants
- **API Keys**: Static API keys for integrations

### Authentication
Two authentication methods are supported:

1. **JWT Token**: Login via `/api/auth/login` to get a token. Use in `Authorization: Bearer <token>` header.

2. **API Key**: Create via `/api/api-keys` endpoint. Use in `X-API-Key: <key>` header.

### AI Integration (OpenWebUI)
Use the `/api/ai/*` endpoints for simplified AI assistant integration:
- `GET /api/ai/data` - Get all user data in one request
- `GET /api/ai/explain` - Get human-readable data summary
- `POST /api/ai/transaction` - Create transaction with smart defaults
- `POST /api/ai/goal` - Create savings goal
- `POST /api/ai/investment` - Add investment
- `POST /api/ai/goal/{id}/contribute` - Add money to goal
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(investments_router, prefix="/api")
app.include_router(goals_router, prefix="/api")
app.include_router(wallet_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(exchange_rates_router, prefix="/api")
app.include_router(api_keys_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint. No authentication required.
    """
    return {
        "status": "healthy",
        "service": "PortofelVirtual API",
        "version": "1.0.0"
    }


@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": "PortofelVirtual API",
        "version": "1.0.0",
        "description": "Personal Budget Management API",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("FASTAPI_HOST", "0.0.0.0")
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)