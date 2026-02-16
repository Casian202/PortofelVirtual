"""
Investment routes.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import InvestmentCreate, InvestmentUpdate, InvestmentResponse, MessageResponse
from auth import get_current_user, User
from database import query, query_one, execute

router = APIRouter(prefix="/investments", tags=["Investments"])


@router.get("", response_model=List[InvestmentResponse])
async def list_investments(
    sort: str = Query("desc", description="Sort order by purchase date: 'asc' or 'desc'"),
    current_user: User = Depends(get_current_user)
):
    """
    List all investments for the authenticated user.

    - **sort**: Sort by purchase date ('asc' for oldest first, 'desc' for newest first)
    """
    order = "ASC" if sort.lower() == "asc" else "DESC"
    investments = query(
        f"""
        SELECT id, name, type, initial_amount, current_value, purchase_date, notes,
               created_by, created_date, updated_date
        FROM investments
        WHERE created_by = %s
        ORDER BY purchase_date {order}
        """,
        (current_user.id,)
    )
    return [InvestmentResponse(**i) for i in investments]


@router.get("/{investment_id}", response_model=InvestmentResponse)
async def get_investment(
    investment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a single investment by ID.
    """
    investment = query_one(
        """
        SELECT id, name, type, initial_amount, current_value, purchase_date, notes,
               created_by, created_date, updated_date
        FROM investments
        WHERE id = %s AND created_by = %s
        """,
        (investment_id, current_user.id)
    )

    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment not found"
        )

    return InvestmentResponse(**investment)


@router.post("", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
async def create_investment(
    investment: InvestmentCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new investment.

    - **name**: Investment name (e.g., 'Bitcoin', 'Apple Stock')
    - **type**: Investment type (e.g., 'crypto', 'stocks', 'bonds', 'real_estate')
    - **initial_amount**: Initial investment amount
    - **current_value**: Current value of the investment
    - **purchase_date**: Date of purchase
    - **notes**: Additional notes (optional)
    """
    investment_id = str(uuid.uuid4())
    result = execute(
        """
        INSERT INTO investments (id, name, type, initial_amount, current_value, purchase_date, notes, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            investment_id,
            investment.name,
            investment.type,
            investment.initial_amount,
            investment.current_value,
            investment.purchase_date,
            investment.notes,
            current_user.id
        )
    )

    return InvestmentResponse(**result)


@router.put("/{investment_id}", response_model=InvestmentResponse)
async def update_investment(
    investment_id: str,
    investment: InvestmentUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing investment.
    Only provided fields will be updated.
    """
    existing = query_one(
        "SELECT * FROM investments WHERE id = %s AND created_by = %s",
        (investment_id, current_user.id)
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment not found"
        )

    # Build update query dynamically
    updates = []
    params = []

    if investment.name is not None:
        updates.append("name = %s")
        params.append(investment.name)

    if investment.type is not None:
        updates.append("type = %s")
        params.append(investment.type)

    if investment.initial_amount is not None:
        updates.append("initial_amount = %s")
        params.append(investment.initial_amount)

    if investment.current_value is not None:
        updates.append("current_value = %s")
        params.append(investment.current_value)

    if investment.purchase_date is not None:
        updates.append("purchase_date = %s")
        params.append(investment.purchase_date)

    if investment.notes is not None:
        updates.append("notes = %s")
        params.append(investment.notes)

    if not updates:
        return InvestmentResponse(**existing)

    updates.append("updated_date = NOW()")
    params.append(investment_id)
    params.append(current_user.id)

    sql = f"UPDATE investments SET {', '.join(updates)} WHERE id = %s AND created_by = %s RETURNING *"
    result = execute(sql, tuple(params))

    return InvestmentResponse(**result)


@router.delete("/{investment_id}", response_model=MessageResponse)
async def delete_investment(
    investment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an investment.
    """
    result = execute(
        "DELETE FROM investments WHERE id = %s AND created_by = %s RETURNING id",
        (investment_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment not found"
        )

    return MessageResponse(message="Investment deleted successfully")