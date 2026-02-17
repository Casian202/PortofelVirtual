"""
Database connection module for FastAPI application.
Connects to the same PostgreSQL database as the Express backend.
"""
import os
import logging
from typing import Optional, List, Any
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:portofel_virtual_secure_2024@localhost:5432/portofelvirtual"
)

# Connection pool
pool: Optional[SimpleConnectionPool] = None


def init_pool():
    """Initialize the connection pool."""
    global pool
    if pool is None:
        pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL
        )
    return pool


def get_connection():
    """Get a connection from the pool."""
    global pool
    if pool is None:
        init_pool()
    return pool.getconn()


def release_connection(conn):
    """Release a connection back to the pool."""
    global pool
    if pool:
        pool.putconn(conn)


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
    finally:
        release_connection(conn)


def query(sql: str, params: tuple = None) -> List[dict]:
    """
    Execute a query and return all results as a list of dictionaries.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


def query_one(sql: str, params: tuple = None) -> Optional[dict]:
    """
    Execute a query and return a single result as a dictionary.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute(sql: str, params: tuple = None) -> dict:
    """
    Execute a query (INSERT, UPDATE, DELETE) and return the affected row.
    Uses RETURNING * to get the updated/inserted row.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            conn.commit()
            row = cur.fetchone()
            return dict(row) if row else {}


def execute_many(sql: str, params_list: List[tuple]) -> int:
    """
    Execute a query multiple times with different parameters.
    Returns the number of rows affected.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, params_list)
            conn.commit()
            return cur.rowcount


def run_migrations():
    """
    Run database migrations.
    Checks and applies necessary schema updates.
    """
    logger.info("Running database migrations...")

    migrations = [
        # Migration 1: Add is_meal_voucher column to transactions table
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'transactions' AND column_name = 'is_meal_voucher'
            ) THEN
                ALTER TABLE transactions ADD COLUMN is_meal_voucher BOOLEAN DEFAULT false;
                CREATE INDEX IF NOT EXISTS idx_transactions_meal_voucher ON transactions(is_meal_voucher) WHERE is_meal_voucher = true;
                RAISE NOTICE 'Added is_meal_voucher column to transactions table';
            END IF;
        END $$;
        """,
        # Migration 2: Ensure recurring_day column exists
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'transactions' AND column_name = 'recurring_day'
            ) THEN
                ALTER TABLE transactions ADD COLUMN recurring_day INTEGER;
                RAISE NOTICE 'Added recurring_day column to transactions table';
            END IF;
        END $$;
        """,
        # Migration 3: Ensure recurring_group_id column exists
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'transactions' AND column_name = 'recurring_group_id'
            ) THEN
                ALTER TABLE transactions ADD COLUMN recurring_group_id UUID;
                RAISE NOTICE 'Added recurring_group_id column to transactions table';
            END IF;
        END $$;
        """,
        # Migration 4: Ensure currency column exists
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'transactions' AND column_name = 'currency'
            ) THEN
                ALTER TABLE transactions ADD COLUMN currency VARCHAR(3) DEFAULT 'RON';
                RAISE NOTICE 'Added currency column to transactions table';
            END IF;
        END $$;
        """,
    ]

    with get_db() as conn:
        with conn.cursor() as cur:
            for i, migration in enumerate(migrations, 1):
                try:
                    cur.execute(migration)
                    conn.commit()
                    logger.info(f"Migration {i} executed successfully")
                except Exception as e:
                    conn.rollback()
                    logger.warning(f"Migration {i} skipped (may already exist): {e}")

    logger.info("Database migrations completed")