"""
Savings goals routes.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import GoalCreate, GoalUpdate, GoalResponse, MessageResponse
from auth import get_current_user, User
from database import query, query_one, execute

router = APIRouter(prefix="/goals", tags=["Savings Goals"])


@router.get("", response_model=List[GoalResponse])
async def list_goals(
    sort: str = Query("asc", description="Sort by deadline: 'asc' or 'desc'"),
    current_user: User = Depends(get_current_user)
):
    """
    List all savings goals for the authenticated user.

    - **sort**: Sort by deadline ('asc' for soonest first, 'desc' for furthest first)
    """
    order = "ASC" if sort.lower() == "asc" else "DESC"
    goals = query(
        f"""
        SELECT id, name, target_amount, current_amount, deadline, icon, color,
               is_completed, currency, created_by, created_date, updated_date
        FROM savings_goals
        WHERE created_by = %s
        ORDER BY
            is_completed ASC,
            CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
            deadline {order}
        """,
        (current_user.id,)
    )
    return [GoalResponse(**g) for g in goals]


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a single savings goal by ID.
    """
    goal = query_one(
        """
        SELECT id, name, target_amount, current_amount, deadline, icon, color,
               is_completed, currency, created_by, created_date, updated_date
        FROM savings_goals
        WHERE id = %s AND created_by = %s
        """,
        (goal_id, current_user.id)
    )

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    return GoalResponse(**goal)


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new savings goal.

    - **name**: Goal name (e.g., 'Emergency Fund', 'Vacation')
    - **target_amount**: Target amount to save
    - **current_amount**: Current saved amount (default: 0)
    - **deadline**: Target deadline date (optional)
    - **icon**: Emoji icon for the goal (default: '🎯')
    - **color**: Hex color code (optional)
    - **currency**: Currency code (default: 'RON')
    """
    goal_id = str(uuid.uuid4())

    # Check if goal should be marked as completed
    is_completed = False
    if goal.current_amount and goal.target_amount:
        from decimal import Decimal
        is_completed = Decimal(str(goal.current_amount)) >= Decimal(str(goal.target_amount))

    result = execute(
        """
        INSERT INTO savings_goals (
            id, name, target_amount, current_amount, deadline, icon, color,
            is_completed, currency, created_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            goal_id,
            goal.name,
            goal.target_amount,
            goal.current_amount or 0,
            goal.deadline,
            goal.icon or "🎯",
            goal.color,
            is_completed,
            goal.currency or "RON",
            current_user.id
        )
    )

    return GoalResponse(**result)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal: GoalUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing savings goal.
    Only provided fields will be updated.
    """
    existing = query_one(
        "SELECT * FROM savings_goals WHERE id = %s AND created_by = %s",
        (goal_id, current_user.id)
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    # Build update query dynamically
    updates = []
    params = []

    if goal.name is not None:
        updates.append("name = %s")
        params.append(goal.name)

    if goal.target_amount is not None:
        updates.append("target_amount = %s")
        params.append(goal.target_amount)

    if goal.current_amount is not None:
        updates.append("current_amount = %s")
        params.append(goal.current_amount)

    if goal.deadline is not None:
        updates.append("deadline = %s")
        params.append(goal.deadline)

    if goal.icon is not None:
        updates.append("icon = %s")
        params.append(goal.icon)

    if goal.color is not None:
        updates.append("color = %s")
        params.append(goal.color)

    if goal.currency is not None:
        updates.append("currency = %s")
        params.append(goal.currency)

    # Handle is_completed - auto-calculate if current_amount or target_amount changed
    if goal.is_completed is not None:
        updates.append("is_completed = %s")
        params.append(goal.is_completed)
    elif goal.current_amount is not None or goal.target_amount is not None:
        from decimal import Decimal
        current = Decimal(str(goal.current_amount)) if goal.current_amount is not None else existing["current_amount"]
        target = Decimal(str(goal.target_amount)) if goal.target_amount is not None else existing["target_amount"]
        if current >= target:
            updates.append("is_completed = %s")
            params.append(True)

    if not updates:
        return GoalResponse(**existing)

    updates.append("updated_date = NOW()")
    params.append(goal_id)
    params.append(current_user.id)

    sql = f"UPDATE savings_goals SET {', '.join(updates)} WHERE id = %s AND created_by = %s RETURNING *"
    result = execute(sql, tuple(params))

    return GoalResponse(**result)


@router.delete("/{goal_id}", response_model=MessageResponse)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a savings goal.
    """
    result = execute(
        "DELETE FROM savings_goals WHERE id = %s AND created_by = %s RETURNING id",
        (goal_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    return MessageResponse(message="Goal deleted successfully")


@router.post("/{goal_id}/add-amount", response_model=GoalResponse)
async def add_amount_to_goal(
    goal_id: str,
    amount: float = Query(..., gt=0, description="Amount to add to current_amount"),
    current_user: User = Depends(get_current_user)
):
    """
    Add an amount to the goal's current_amount.
    Automatically marks goal as completed if target is reached.
    """
    existing = query_one(
        "SELECT * FROM savings_goals WHERE id = %s AND created_by = %s",
        (goal_id, current_user.id)
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )

    from decimal import Decimal
    new_amount = Decimal(str(existing["current_amount"])) + Decimal(str(amount))
    is_completed = new_amount >= Decimal(str(existing["target_amount"]))

    result = execute(
        """
        UPDATE savings_goals
        SET current_amount = %s, is_completed = %s, updated_date = NOW()
        WHERE id = %s AND created_by = %s
        RETURNING *
        """,
        (new_amount, is_completed, goal_id, current_user.id)
    )

    return GoalResponse(**result)