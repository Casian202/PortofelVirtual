"""
Database connection module for FastAPI application.
Connects to the same PostgreSQL database as the Express backend.
"""
import os
from typing import Optional, List, Any
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

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