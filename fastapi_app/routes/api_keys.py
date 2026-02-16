"""
API Keys management routes.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from models import MessageResponse
from auth import get_current_user, generate_api_key, User, APIKeyResponse
from database import query, query_one, execute

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(current_user: User = Depends(get_current_user)):
    """
    List all API keys for the current user.
    Note: Only shows masked keys for security.
    """
    keys = query(
        """
        SELECT id, name,
               CONCAT(SUBSTRING(key, 1, 10), '...') as key,
               created_at, last_used_at
        FROM api_keys
        WHERE user_id = %s AND is_active = true
        ORDER BY created_at DESC
        """,
        (current_user.id,)
    )
    return [APIKeyResponse(**k) for k in keys]


@router.post("", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    name: str = "API Key",
    current_user: User = Depends(get_current_user)
):
    """
    Create a new API key.

    **Important**: The full key is only shown once! Save it securely.

    Use this key for API authentication by passing it in the `X-API-Key` header.
    """
    # Check if user has too many keys (limit to 10)
    existing = query_one(
        "SELECT COUNT(*) as count FROM api_keys WHERE user_id = %s AND is_active = true",
        (current_user.id,)
    )
    if existing and existing["count"] >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of API keys (10) reached. Delete some keys first."
        )

    key = generate_api_key()
    key_id = str(uuid.uuid4())

    result = execute(
        """
        INSERT INTO api_keys (id, user_id, name, key, is_active)
        VALUES (%s, %s, %s, %s, true)
        RETURNING id, name, key, created_at, last_used_at
        """,
        (key_id, current_user.id, name, key)
    )

    return APIKeyResponse(**result)


@router.delete("/{key_id}", response_model=MessageResponse)
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete (revoke) an API key.
    """
    result = execute(
        "DELETE FROM api_keys WHERE id = %s AND user_id = %s RETURNING id",
        (key_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return MessageResponse(message="API key deleted successfully")


@router.post("/{key_id}/deactivate", response_model=MessageResponse)
async def deactivate_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Deactivate an API key without deleting it.
    """
    result = execute(
        """
        UPDATE api_keys SET is_active = false
        WHERE id = %s AND user_id = %s
        RETURNING id
        """,
        (key_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return MessageResponse(message="API key deactivated successfully")