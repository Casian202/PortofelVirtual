"""
Transaction routes.
"""
import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TransactionType, RecurringGenerateRequest, RecurringGenerateResponse,
    MessageResponse
)
from auth import get_current_user, User
from database import query, query_one, execute

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    sort: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    type: Optional[TransactionType] = Query(None, description="Filter by transaction type"),
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user)
):
    """
    List all transactions for the authenticated user.

    Supports filtering by:
    - **type**: 'income' or 'expense'
    - **month**: Month in YYYY-MM format
    - **sort**: Sort by date ('asc' or 'desc')
    """
    sql = """
        SELECT id, amount, type, category_id, category_name, description, date, month,
               currency, is_recurring, recurring_group_id, recurring_day, is_meal_voucher, created_by,
               created_date, updated_date
        FROM transactions
        WHERE created_by = %s
    """
    params = [current_user.id]

    if type:
        sql += " AND type = %s"
        params.append(type.value)

    if month:
        sql += " AND month = %s"
        params.append(month)

    order = "ASC" if sort.lower() == "asc" else "DESC"
    sql += f" ORDER BY date {order}, created_date {order}"
    sql += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    transactions = query(sql, tuple(params))
    return [TransactionResponse(**t) for t in transactions]


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a single transaction by ID.
    """
    transaction = query_one(
        """
        SELECT id, amount, type, category_id, category_name, description, date, month,
               currency, is_recurring, recurring_group_id, recurring_day, is_meal_voucher, created_by,
               created_date, updated_date
        FROM transactions
        WHERE id = %s AND created_by = %s
        """,
        (transaction_id, current_user.id)
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return TransactionResponse(**transaction)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new transaction.

    - **amount**: Positive decimal amount
    - **type**: 'income' or 'expense'
    - **category_name**: Category name (will auto-link if category exists)
    - **date**: Transaction date
    - **month**: Month in YYYY-MM format (usually same as date's month)
    - **is_recurring**: Set true for monthly recurring transactions
    - **recurring_day**: Day of month for recurring (1-31)
    """
    # Find or create category
    category = query_one(
        "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s",
        (transaction.category_name, current_user.id)
    )

    category_id = category["id"] if category else None
    transaction_id = str(uuid.uuid4())

    # Generate recurring_group_id for recurring transactions
    recurring_group_id = None
    if transaction.is_recurring:
        recurring_group_id = str(uuid.uuid4())

    result = execute(
        """
        INSERT INTO transactions (
            id, amount, type, category_id, category_name, description, date, month,
            currency, is_recurring, recurring_group_id, recurring_day, created_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            transaction_id,
            transaction.amount,
            transaction.type.value,
            category_id,
            transaction.category_name,
            transaction.description,
            transaction.date,
            transaction.month,
            transaction.currency or "RON",
            transaction.is_recurring,
            recurring_group_id,
            transaction.recurring_day,
            current_user.id
        )
    )

    return TransactionResponse(**result)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction: TransactionUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing transaction.
    Only provided fields will be updated.
    """
    existing = query_one(
        "SELECT * FROM transactions WHERE id = %s AND created_by = %s",
        (transaction_id, current_user.id)
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Build update query dynamically
    updates = []
    params = []

    if transaction.amount is not None:
        updates.append("amount = %s")
        params.append(transaction.amount)

    if transaction.type is not None:
        updates.append("type = %s")
        params.append(transaction.type.value)

    if transaction.category_name is not None:
        updates.append("category_name = %s")
        params.append(transaction.category_name)
        # Also try to link category
        category = query_one(
            "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s",
            (transaction.category_name, current_user.id)
        )
        if category:
            updates.append("category_id = %s")
            params.append(category["id"])

    if transaction.description is not None:
        updates.append("description = %s")
        params.append(transaction.description)

    if transaction.date is not None:
        updates.append("date = %s")
        params.append(transaction.date)

    if transaction.month is not None:
        updates.append("month = %s")
        params.append(transaction.month)

    if transaction.currency is not None:
        updates.append("currency = %s")
        params.append(transaction.currency)

    if transaction.is_recurring is not None:
        updates.append("is_recurring = %s")
        params.append(transaction.is_recurring)

    if transaction.recurring_day is not None:
        updates.append("recurring_day = %s")
        params.append(transaction.recurring_day)

    if not updates:
        return TransactionResponse(**existing)

    updates.append("updated_date = NOW()")
    params.append(transaction_id)
    params.append(current_user.id)

    sql = f"UPDATE transactions SET {', '.join(updates)} WHERE id = %s AND created_by = %s RETURNING *"
    result = execute(sql, tuple(params))

    return TransactionResponse(**result)


@router.delete("/{transaction_id}", response_model=MessageResponse)
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a transaction.
    """
    result = execute(
        "DELETE FROM transactions WHERE id = %s AND created_by = %s RETURNING id",
        (transaction_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return MessageResponse(message="Transaction deleted successfully")


@router.post("/generate-recurring", response_model=RecurringGenerateResponse)
async def generate_recurring(
    request: RecurringGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate recurring transactions for a specific month.

    Creates transaction instances from recurring transaction templates.
    - **month**: Month in YYYY-MM format
    """
    # Get recurring transactions that haven't been generated for this month
    recurring_templates = query(
        """
        SELECT DISTINCT ON (recurring_group_id)
            id, amount, type, category_id, category_name, description,
            currency, recurring_group_id, recurring_day
        FROM transactions
        WHERE created_by = %s
          AND is_recurring = true
          AND recurring_group_id IS NOT NULL
          AND recurring_group_id NOT IN (
              SELECT recurring_group_id FROM transactions
              WHERE created_by = %s AND month = %s AND recurring_group_id IS NOT NULL
          )
        """,
        (current_user.id, current_user.id, request.month)
    )

    created_transactions = []
    for template in recurring_templates:
        # Calculate the date for this month
        year, month = map(int, request.month.split("-"))
        day = template["recurring_day"] or 1
        # Ensure day is valid for the month
        import calendar
        max_day = calendar.monthrange(year, month)[1]
        day = min(day, max_day)
        transaction_date = date(year, month, day)

        transaction_id = str(uuid.uuid4())
        result = execute(
            """
            INSERT INTO transactions (
                id, amount, type, category_id, category_name, description, date, month,
                currency, is_recurring, recurring_group_id, recurring_day, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, %s, %s, %s)
            RETURNING *
            """,
            (
                transaction_id,
                template["amount"],
                template["type"],
                template["category_id"],
                template["category_name"],
                template["description"],
                transaction_date,
                request.month,
                template["currency"],
                template["recurring_group_id"],
                template["recurring_day"],
                current_user.id
            )
        )
        created_transactions.append(TransactionResponse(**result))

    return RecurringGenerateResponse(
        message=f"Generated {len(created_transactions)} recurring transactions",
        created_count=len(created_transactions),
        created_transactions=created_transactions
    )


@router.post("/stop-recurring/{group_id}", response_model=MessageResponse)
async def stop_recurring(
    group_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Stop future recurring transactions for a group.

    Sets is_recurring to false for all transactions in the group.
    """
    result = execute(
        """
        UPDATE transactions
        SET is_recurring = false, updated_date = NOW()
        WHERE recurring_group_id = %s AND created_by = %s
        RETURNING id
        """,
        (group_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring group not found"
        )

    return MessageResponse(message="Recurring transactions stopped successfully")