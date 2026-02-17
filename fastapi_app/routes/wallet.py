"""
Wallet and summary routes.
"""
from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends
from models import WalletSummaryResponse, WalletBalance, MonthlySummary, MealVoucherBalance
from auth import get_current_user, User
from database import query

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