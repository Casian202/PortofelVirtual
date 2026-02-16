"""
Authentication routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from models import (
    LoginRequest, LoginResponse, UserResponse,
    PasswordChangeRequest, MessageResponse
)
from auth import (
    get_current_user, verify_password, hash_password, create_token, User
)
from database import query_one, execute

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return JWT token.

    - **email**: User's email address
    - **password**: User's password
    """
    user = query_one(
        "SELECT * FROM users WHERE email = %s",
        (request.email,)
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_token(
        user_id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        role=user.get("role", "user")
    )

    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            role=user.get("role", "user"),
            must_change_password=user.get("must_change_password", False),
            created_date=user.get("created_date"),
            updated_date=user.get("updated_date")
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    Requires Bearer token in Authorization header.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        must_change_password=current_user.must_change_password
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Change user's password.
    Requires current password for verification.
    """
    user = query_one(
        "SELECT password_hash FROM users WHERE id = %s",
        (current_user.id,)
    )

    if not user or not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_hash = hash_password(request.new_password)
    execute(
        "UPDATE users SET password_hash = %s, must_change_password = false, updated_date = NOW() WHERE id = %s",
        (new_hash, current_user.id)
    )

    return MessageResponse(message="Password changed successfully")