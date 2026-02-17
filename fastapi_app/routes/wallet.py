"""
Wallet and summary routes.
"""
import uuid
from datetime import date
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import (
    WalletSummaryResponse, WalletBalance, MonthlySummary, MealVoucherBalance,
    TransactionResponse, MessageResponse
)
from auth import get_current_user, User
from database import query, query_one, execute

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("/balance", response_model=List[WalletBalance])
async def get_balance(current_user: User = Depends(get_current_user)):
    """
    Get current balance broken down by currency.

    Returns total income, expenses, and balance for each currency used.
    """
    balances = query(
        """
        SELECT
            currency,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE created_by = %s
        GROUP BY currency
        ORDER BY currency
        """,
        (current_user.id,)
    )

    return [
        WalletBalance(
            currency=b["currency"] or "RON",
            total_income=b["total_income"],
            total_expenses=b["total_expenses"],
            balance=b["balance"],
            transaction_count=b["transaction_count"]
        )
        for b in balances
    ]


@router.get("/summary", response_model=WalletSummaryResponse)
async def get_summary(current_user: User = Depends(get_current_user)):
    """
    Get comprehensive wallet summary including:
    - Balance by currency
    - Monthly summaries (income, expenses, net savings)
    - Cumulative savings over time
    """
    # Get balances by currency
    balances = query(
        """
        SELECT
            currency,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE created_by = %s
        GROUP BY currency
        ORDER BY currency
        """,
        (current_user.id,)
    )

    # Get exchange rates
    exchange_rates = query("SELECT currency, rate FROM exchange_rates")
    rates_map = {r["currency"]: r["rate"] for r in exchange_rates}

    # Calculate total balance in RON
    total_balance_ron = Decimal("0")
    wallet_balances = []
    for b in balances:
        currency = b["currency"] or "RON"
        balance = b["balance"]
        wallet_balances.append(WalletBalance(
            currency=currency,
            total_income=b["total_income"],
            total_expenses=b["total_expenses"],
            balance=balance,
            transaction_count=b["transaction_count"]
        ))
        # Convert to RON
        if currency == "RON":
            total_balance_ron += balance
        elif currency in rates_map:
            total_balance_ron += balance * rates_map[currency]

    # Get monthly summaries with cumulative savings
    monthly_data = query(
        """
        SELECT
            month,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE created_by = %s
        GROUP BY month
        ORDER BY month ASC
        """,
        (current_user.id,)
    )

    # Calculate cumulative savings
    cumulative = Decimal("0")
    monthly_summaries = []
    for m in monthly_data:
        net_savings = m["total_income"] - m["total_expenses"]
        cumulative += net_savings
        monthly_summaries.append(MonthlySummary(
            month=m["month"],
            total_income=m["total_income"],
            total_expenses=m["total_expenses"],
            net_savings=net_savings,
            cumulative_savings=cumulative,
            transaction_count=m["transaction_count"]
        ))

    return WalletSummaryResponse(
        balances=wallet_balances,
        monthly_summaries=monthly_summaries,
        total_balance_ron=total_balance_ron
    )


@router.get("/monthly/{month}", response_model=MonthlySummary)
async def get_monthly_summary(
    month: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get summary for a specific month.

    - **month**: Month in YYYY-MM format
    """
    data = query(
        """
        SELECT
            month,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE created_by = %s AND month = %s
        GROUP BY month
        """,
        (current_user.id, month)
    )

    if not data:
        return MonthlySummary(
            month=month,
            total_income=Decimal("0"),
            total_expenses=Decimal("0"),
            net_savings=Decimal("0"),
            cumulative_savings=Decimal("0"),
            transaction_count=0
        )

    m = data[0]
    net_savings = m["total_income"] - m["total_expenses"]

    # Calculate cumulative savings up to this month
    cumulative = query(
        """
        SELECT COALESCE(SUM(
            CASE WHEN type = 'income' THEN amount ELSE -amount END
        ), 0) as cumulative
        FROM transactions
        WHERE created_by = %s AND month <= %s
        """,
        (current_user.id, month)
    )

    return MonthlySummary(
        month=m["month"],
        total_income=m["total_income"],
        total_expenses=m["total_expenses"],
        net_savings=net_savings,
        cumulative_savings=cumulative[0]["cumulative"] if cumulative else Decimal("0"),
        transaction_count=m["transaction_count"]
    )


@router.get("/stats/categories")
async def get_category_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get spending/income breakdown by category.

    Returns statistics grouped by category with totals and counts.
    """
    stats = query(
        """
        SELECT
            c.id as category_id,
            c.name as category_name,
            c.type,
            c.icon,
            c.color,
            COUNT(t.id) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as average_amount,
            MIN(t.date) as first_transaction,
            MAX(t.date) as last_transaction
        FROM budget_categories c
        LEFT JOIN transactions t ON c.id = t.category_id AND t.created_by = %s
        WHERE c.created_by = %s
        GROUP BY c.id, c.name, c.type, c.icon, c.color
        ORDER BY c.type, total_amount DESC NULLS LAST
        """,
        (current_user.id, current_user.id)
    )

    return stats


@router.get("/meal-vouchers", response_model=MealVoucherBalance)
async def get_meal_voucher_balance(current_user: User = Depends(get_current_user)):
    """
    Get meal voucher balance.

    Returns total meal voucher income, expenses, and remaining balance.
    Meal vouchers can only be spent on food category (Alimente).
    """
    result = query(
        """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
        FROM transactions
        WHERE created_by = %s AND is_meal_voucher = true
        """,
        (current_user.id,)
    )

    if not result:
        return MealVoucherBalance(
            balance=Decimal("0"),
            total_income=Decimal("0"),
            total_expense=Decimal("0")
        )

    total_income = Decimal(str(result[0]["total_income"]))
    total_expense = Decimal(str(result[0]["total_expense"]))
    balance = total_income - total_expense

    return MealVoucherBalance(
        balance=balance,
        total_income=total_income,
        total_expense=total_expense
    )


@router.post("/meal-vouchers/receive", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def receive_meal_vouchers(
    amount: Decimal,
    description: Optional[str] = None,
    transaction_date: Optional[date] = None,
    is_recurring: bool = True,
    current_user: User = Depends(get_current_user)
):
    """
    Receive meal vouchers (income).

    Automatically sets is_meal_voucher=true and currency=RON.
    Defaults is_recurring=true since meal vouchers come monthly.

    - **amount**: Amount of meal vouchers received (in RON)
    - **description**: Optional description (e.g., "Bonuri de masă Februarie 2026")
    - **transaction_date**: Date of receipt (defaults to today)
    - **is_recurring**: Whether this is a recurring monthly income (default: true)
    """
    # Use today's date if not provided
    if transaction_date is None:
        transaction_date = date.today()

    # Calculate month from date
    month = transaction_date.strftime("%Y-%m")

    # Find or create "Bonuri de masă" category
    category = query_one(
        "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s",
        ("Bonuri de masă", current_user.id)
    )

    category_id = category["id"] if category else None
    transaction_id = str(uuid.uuid4())

    # Generate recurring_group_id for recurring transactions
    recurring_group_id = None
    if is_recurring:
        recurring_group_id = str(uuid.uuid4())

    result = execute(
        """
        INSERT INTO transactions (
            id, amount, type, category_id, category_name, description, date, month,
            currency, is_recurring, recurring_group_id, recurring_day, is_meal_voucher, created_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            transaction_id,
            amount,
            "income",
            category_id,
            "Bonuri de masă",
            description,
            transaction_date,
            month,
            "RON",
            is_recurring,
            recurring_group_id,
            transaction_date.day,
            True,  # is_meal_voucher
            current_user.id
        )
    )

    return TransactionResponse(**result)


@router.post("/meal-vouchers/spend", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def spend_meal_vouchers(
    amount: Decimal,
    description: Optional[str] = None,
    transaction_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Spend meal vouchers on food (Alimente category only).

    Automatically sets category_name="Alimente", is_meal_voucher=true, currency=RON.
    Validates that sufficient meal voucher balance is available.

    - **amount**: Amount to spend (in RON)
    - **description**: Optional description (e.g., "Prânz restaurant")
    - **transaction_date**: Date of spending (defaults to today)
    """
    # Use today's date if not provided
    if transaction_date is None:
        transaction_date = date.today()

    # Calculate month from date
    month = transaction_date.strftime("%Y-%m")

    # Check meal voucher balance
    balance_result = query(
        """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
        FROM transactions
        WHERE created_by = %s AND is_meal_voucher = true
        """,
        (current_user.id,)
    )

    total_income = Decimal(str(balance_result[0]["total_income"])) if balance_result else Decimal("0")
    total_expense = Decimal(str(balance_result[0]["total_expense"])) if balance_result else Decimal("0")
    current_balance = total_income - total_expense

    if amount > current_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient meal voucher balance. Available: {current_balance} RON, Requested: {amount} RON"
        )

    # Find or create "Alimente" category
    category = query_one(
        "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s",
        ("Alimente", current_user.id)
    )

    category_id = category["id"] if category else None
    transaction_id = str(uuid.uuid4())

    result = execute(
        """
        INSERT INTO transactions (
            id, amount, type, category_id, category_name, description, date, month,
            currency, is_recurring, is_meal_voucher, created_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            transaction_id,
            amount,
            "expense",
            category_id,
            "Alimente",
            description,
            transaction_date,
            month,
            "RON",
            False,  # is_recurring - expenses are not recurring
            True,   # is_meal_voucher
            current_user.id
        )
    )

    return TransactionResponse(**result)


@router.get("/meal-vouchers/transactions", response_model=List[TransactionResponse])
async def list_meal_voucher_transactions(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """
    List all meal voucher transactions.

    Returns transactions where is_meal_voucher=true, ordered by date descending.

    - **limit**: Maximum number of results (default: 50, max: 500)
    - **offset**: Number of results to skip (default: 0)
    """
    transactions = query(
        """
        SELECT id, amount, type, category_id, category_name, description, date, month,
               currency, is_recurring, recurring_group_id, recurring_day, is_meal_voucher, created_by,
               created_date, updated_date
        FROM transactions
        WHERE created_by = %s AND is_meal_voucher = true
        ORDER BY date DESC, created_date DESC
        LIMIT %s OFFSET %s
        """,
        (current_user.id, limit, offset)
    )

    return [TransactionResponse(**t) for t in transactions]


@router.delete("/meal-vouchers/transactions/{transaction_id}", response_model=MessageResponse)
async def delete_meal_voucher_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a meal voucher transaction.

    Only transactions belonging to the authenticated user and marked as meal vouchers can be deleted.
    """
    result = execute(
        "DELETE FROM transactions WHERE id = %s AND created_by = %s AND is_meal_voucher = true RETURNING id",
        (transaction_id, current_user.id)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal voucher transaction not found"
        )

    return MessageResponse(message="Meal voucher transaction deleted successfully")