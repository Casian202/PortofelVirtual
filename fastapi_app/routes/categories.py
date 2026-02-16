"""
Category routes.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import (
    CategoryCreate, CategoryUpdate, CategoryResponse, TransactionType, MessageResponse
)
from auth import get_current_user, User
from database import query, query_one, execute

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    type: Optional[TransactionType] = Query(None, description="Filter by category type"),
    current_user: User = Depends(get_current_user)
):
    """
    List all budget categories for the authenticated user.

    Supports filtering by:
    - **type**: 'income' or 'expense'
    """
    sql = """
        SELECT id, name, type, icon, color, is_active, created_by, created_date, updated_date
        FROM budget_categories
        WHERE created_by = %s
    """
    params = [current_user.id]

    if type:
        sql += " AND type = %s"
        params.append(type.value)

    sql += " ORDER BY name"

    categories = query(sql, tuple(params))
    return [CategoryResponse(**c) for c in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a single category by ID.
    """
    category = query_one(
        """
        SELECT id, name, type, icon, color, is_active, created_by, created_date, updated_date
        FROM budget_categories
        WHERE id = %s AND created_by = %s
        """,
        (category_id, current_user.id)
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return CategoryResponse(**category)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new budget category.

    - **name**: Category name (e.g., 'Salary', 'Food', 'Transport')
    - **type**: 'income' or 'expense'
    - **icon**: Emoji icon (default: '💡')
    - **color**: Hex color code (e.g., '#4CAF50')
    """
    # Check if category with same name already exists
    existing = query_one(
        "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s",
        (category.name, current_user.id)
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category.name}' already exists"
        )

    category_id = str(uuid.uuid4())
    result = execute(
        """
        INSERT INTO budget_categories (id, name, type, icon, color, is_active, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            category_id,
            category.name,
            category.type.value,
            category.icon or "💡",
            category.color,
            category.is_active if category.is_active is not None else True,
            current_user.id
        )
    )

    return CategoryResponse(**result)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing category.
    Only provided fields will be updated.
    """
    existing = query_one(
        "SELECT * FROM budget_categories WHERE id = %s AND created_by = %s",
        (category_id, current_user.id)
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Build update query dynamically
    updates = []
    params = []

    if category.name is not None:
        # Check for duplicate name
        duplicate = query_one(
            "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s AND id != %s",
            (category.name, current_user.id, category_id)
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category.name}' already exists"
            )
        updates.append("name = %s")
        params.append(category.name)

    if category.type is not None:
        updates.append("type = %s")
        params.append(category.type.value)

    if category.icon is not None:
        updates.append("icon = %s")
        params.append(category.icon)

    if category.color is not None:
        updates.append("color = %s")
        params.append(category.color)

    if category.is_active is not None:
        updates.append("is_active = %s")
        params.append(category.is_active)

    if not updates:
        return CategoryResponse(**existing)

    updates.append("updated_date = NOW()")
    params.append(category_id)
    params.append(current_user.id)

    sql = f"UPDATE budget_categories SET {', '.join(updates)} WHERE id = %s AND created_by = %s RETURNING *"
    result = execute(sql, tuple(params))

    return CategoryResponse(**result)


@router.delete("/{category_id}", response_model=MessageResponse)
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a category.
    Transactions using this category will have their category_id set to NULL.
    """
    result = execute(
        "DELETE FROM budget_categories WHERE id = %s AND created_by = %s RETURNING id",
        (category_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return MessageResponse(message="Category deleted successfully")