"""Routes package for FastAPI application."""
from .auth import router as auth_router
from .transactions import router as transactions_router
from .categories import router as categories_router
from .investments import router as investments_router
from .goals import router as goals_router
from .wallet import router as wallet_router
from .ai import router as ai_router
from .admin import router as admin_router
from .exchange_rates import router as exchange_rates_router
from .api_keys import router as api_keys_router

__all__ = [
    "auth_router",
    "transactions_router",
    "categories_router",
    "investments_router",
    "goals_router",
    "wallet_router",
    "ai_router",
    "admin_router",
    "exchange_rates_router",
    "api_keys_router",
]