"""
Admin routes (requires admin role).
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from models import UserResponse, UserCreate, MessageResponse
from auth import get_current_user, require_admin, hash_password, User
from database import query, query_one, execute

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(admin: User = Depends(require_admin)):
    """
    List all users. Admin only.
    """
    users = query(
        """
        SELECT id, email, full_name, role, must_change_password, created_date, updated_date
        FROM users
        ORDER BY created_date DESC
        """
    )
    return [UserResponse(**u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    admin: User = Depends(require_admin)
):
    """
    Create a new user. Admin only.
    The new user will be required to change their password on first login.
    """
    # Check if email already exists
    existing = query_one(
        "SELECT id FROM users WHERE email = %s",
        (user_data.email,)
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_data.email}' already exists"
        )

    user_id = str(uuid.uuid4())
    password_hash = hash_password(user_data.password)

    result = execute(
        """
        INSERT INTO users (id, email, password_hash, full_name, role, must_change_password)
        VALUES (%s, %s, %s, %s, 'user', true)
        RETURNING id, email, full_name, role, must_change_password, created_date, updated_date
        """,
        (user_id, user_data.email, password_hash, user_data.full_name)
    )

    return UserResponse(**result)


@router.delete("/users/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: str,
    admin: User = Depends(require_admin)
):
    """
    Delete a user. Admin only.
    Cannot delete yourself.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    result = execute(
        "DELETE FROM users WHERE id = %s RETURNING id",
        (user_id,)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return MessageResponse(message="User deleted successfully")


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    role: str,
    admin: User = Depends(require_admin)
):
    """
    Update a user's role. Admin only.
    Cannot change your own role.
    Valid roles: 'user', 'admin'
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )

    if role not in ("user", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'user' or 'admin'"
        )

    result = execute(
        """
        UPDATE users SET role = %s, updated_date = NOW()
        WHERE id = %s
        RETURNING id, email, full_name, role, must_change_password, created_date, updated_date
        """,
        (role, user_id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(**result)