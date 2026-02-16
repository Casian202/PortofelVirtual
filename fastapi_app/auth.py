"""
Authentication module for FastAPI application.
Supports both JWT tokens and API Keys.
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel

from database import query_one, execute

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "portofel_virtual_jwt_secret_key_2024")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

# Bearer token scheme
security = HTTPBearer()


class TokenData(BaseModel):
    """Token payload data."""
    id: str
    email: str
    full_name: Optional[str] = None
    role: str = "user"


class User(BaseModel):
    """User model."""
    id: str
    email: str
    full_name: Optional[str] = None
    role: str = "user"
    must_change_password: bool = False


class APIKeyResponse(BaseModel):
    """API Key response model."""
    id: str
    name: str
    key: str
    created_at: datetime
    last_used_at: Optional[datetime] = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password."""
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')


def create_token(user_id: str, email: str, full_name: str = None, role: str = "user") -> str:
    """Create a JWT token for a user."""
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"pv_{secrets.token_urlsafe(32)}"


async def get_user_by_api_key(api_key: str) -> Optional[User]:
    """Get user by API key."""
    key_data = query_one(
        """
        SELECT ak.id as key_id, ak.user_id, u.email, u.full_name, u.role, u.must_change_password
        FROM api_keys ak
        JOIN users u ON ak.user_id = u.id
        WHERE ak.key = %s AND ak.is_active = true
        """,
        (api_key,)
    )
    if key_data:
        # Update last_used_at
        execute(
            "UPDATE api_keys SET last_used_at = NOW() WHERE id = %s",
            (key_data["key_id"],)
        )
        return User(
            id=key_data["user_id"],
            email=key_data["email"],
            full_name=key_data["full_name"],
            role=key_data["role"],
            must_change_password=key_data["must_change_password"]
        )
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_api_key: Optional[str] = Header(None)
) -> User:
    """
    Dependency to get the current authenticated user.
    Supports both JWT token and API Key authentication.
    """
    # Try API Key first
    if x_api_key:
        user = await get_user_by_api_key(x_api_key)
        if user:
            return user

    # Fall back to JWT token
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Get user from database
    user = query_one(
        "SELECT id, email, full_name, role, must_change_password FROM users WHERE id = %s",
        (user_id,)
    )

    if user is None:
        raise credentials_exception

    return User(**user)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    x_api_key: Optional[str] = Header(None)
) -> Optional[User]:
    """
    Dependency to optionally get the current user.
    Returns None if no valid authentication provided.
    """
    # Try API Key first
    if x_api_key:
        user = await get_user_by_api_key(x_api_key)
        if user:
            return user

    if credentials is None:
        return None

    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        user_id = payload.get("id")
        if user_id is None:
            return None

        user = query_one(
            "SELECT id, email, full_name, role, must_change_password FROM users WHERE id = %s",
            (user_id,)
        )
        if user:
            return User(**user)
    except JWTError:
        pass

    return None


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires the user to have admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user