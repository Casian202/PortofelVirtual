"""
AI-friendly routes for OpenWebUI integration.
These endpoints are designed to be easily consumed by AI assistants.
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from models import (
    AIDataSummary, AITransactionCreate, AIGoalCreate, AIInvestmentCreate,
    TransactionResponse, GoalResponse, InvestmentResponse, CategoryResponse,
    TransactionType, MessageResponse
)
from auth import get_current_user, User
from database import query, query_one, execute
import uuid

router = APIRouter(prefix="/ai", tags=["AI Assistant Endpoints"])


@router.get("/data", response_model=AIDataSummary)
async def get_all_data(current_user: User = Depends(get_current_user)):
    """
    **AI-FRIENDLY ENDPOINT**: Get all user data in a single, well-structured response.

    This endpoint returns everything an AI needs to understand the user's financial situation:
    - User profile
    - All categories (income/expense types)
    - All transactions (history)
    - All investments
    - All savings goals
    - Current exchange rates
    - Wallet summary (balances, monthly summaries)

    Perfect for AI assistants that need a complete overview of the user's finances.
    """
    # Get user info
    user_data = query_one(
        "SELECT id, email, full_name, role, must_change_password, created_date, updated_date FROM users WHERE id = %s",
        (current_user.id,)
    )

    # Get categories
    categories = query(
        "SELECT id, name, type, icon, color, is_active, created_by, created_date, updated_date FROM budget_categories WHERE created_by = %s ORDER BY name",
        (current_user.id,)
    )

    # Get transactions
    transactions = query(
        """
        SELECT id, amount, type, category_id, category_name, description, date, month,
               currency, is_recurring, recurring_group_id, recurring_day, created_by,
               created_date, updated_date
        FROM transactions
        WHERE created_by = %s
        ORDER BY date DESC
        LIMIT 500
        """,
        (current_user.id,)
    )

    # Get investments
    investments = query(
        """
        SELECT id, name, type, initial_amount, current_value, purchase_date, notes,
               created_by, created_date, updated_date
        FROM investments
        WHERE created_by = %s
        ORDER BY purchase_date DESC
        """,
        (current_user.id,)
    )

    # Get goals
    goals = query(
        """
        SELECT id, name, target_amount, current_amount, deadline, icon, color,
               is_completed, currency, created_by, created_date, updated_date
        FROM savings_goals
        WHERE created_by = %s
        ORDER BY is_completed ASC, deadline ASC NULLS LAST
        """,
        (current_user.id,)
    )

    # Get exchange rates
    exchange_rates = query("SELECT id, currency, rate, updated_at, updated_by FROM exchange_rates")

    # Get wallet summary
    from routes.wallet import get_summary
    wallet_summary = await get_summary(current_user)

    return AIDataSummary(
        user={
            "id": user_data["id"],
            "email": user_data["email"],
            "full_name": user_data.get("full_name"),
            "role": user_data.get("role", "user"),
            "must_change_password": user_data.get("must_change_password", False),
            "created_date": user_data.get("created_date"),
            "updated_date": user_data.get("updated_date")
        },
        categories=[CategoryResponse(**c) for c in categories],
        transactions=[TransactionResponse(**t) for t in transactions],
        investments=[InvestmentResponse(**i) for i in investments],
        goals=[GoalResponse(**g) for g in goals],
        exchange_rates=exchange_rates,
        wallet_summary=wallet_summary
    )


@router.get("/explain")
async def explain_data(current_user: User = Depends(get_current_user)):
    """
    **AI-FRIENDLY ENDPOINT**: Get a text explanation of all user data.

    Returns a human-readable summary of the user's financial situation,
    designed for AI assistants to understand context quickly.
    """
    # Get all data
    summary = await get_all_data(current_user)

    explanation = {
        "user": {
            "description": "The authenticated user of the budget application",
            "data": {
                "name": summary.user.full_name or "Not set",
                "email": summary.user.email,
                "role": summary.user.role
            }
        },
        "categories": {
            "description": "Budget categories for organizing income and expenses",
            "income_categories": [
                {"name": c.name, "icon": c.icon}
                for c in summary.categories if c.type == TransactionType.INCOME
            ],
            "expense_categories": [
                {"name": c.name, "icon": c.icon}
                for c in summary.categories if c.type == TransactionType.EXPENSE
            ]
        },
        "transactions": {
            "description": "Financial transactions (income and expenses)",
            "total_count": len(summary.transactions),
            "income_count": len([t for t in summary.transactions if t.type == TransactionType.INCOME]),
            "expense_count": len([t for t in summary.transactions if t.type == TransactionType.EXPENSE])
        },
        "investments": {
            "description": "User's investments (stocks, crypto, etc.)",
            "total_count": len(summary.investments),
            "total_initial": float(sum(i.initial_amount for i in summary.investments)),
            "total_current": float(sum(i.current_value for i in summary.investments))
        },
        "goals": {
            "description": "Savings goals the user is working towards",
            "goals": [
                {
                    "name": g.name,
                    "target": float(g.target_amount),
                    "current": float(g.current_amount),
                    "progress": f"{float(g.current_amount) / float(g.target_amount) * 100:.1f}%" if g.target_amount > 0 else "0%",
                    "completed": g.is_completed
                }
                for g in summary.goals
            ]
        },
        "wallet": {
            "description": "Current financial summary",
            "total_balance_ron": float(summary.wallet_summary.total_balance_ron),
            "balances_by_currency": [
                {"currency": b.currency, "balance": float(b.balance)}
                for b in summary.wallet_summary.balances
            ]
        }
    }

    return explanation


@router.post("/transaction", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction_simple(
    transaction: AITransactionCreate,
    current_user: User = Depends(get_current_user)
):
    """
    **AI-FRIENDLY ENDPOINT**: Create a transaction with minimal, intuitive input.

    This simplified endpoint is designed for AI assistants to easily add transactions.

    **Key Features**:
    - Auto-generates `month` from `date` (defaults to current month)
    - Auto-sets `date` to today if not provided
    - Auto-links to existing category by name
    - Clear, simple field names

    **Example Request**:
    ```json
    {
        "amount": 150.50,
        "type": "expense",
        "category_name": "Food",
        "description": "Weekly groceries",
        "currency": "RON"
    }
    ```

    For recurring transactions:
    ```json
    {
        "amount": 5000,
        "type": "income",
        "category_name": "Salary",
        "description": "Monthly salary",
        "is_recurring": true,
        "recurring_day": 1
    }
    ```
    """
    # Set defaults
    transaction_date = date.today()
    if transaction.date:
        try:
            transaction_date = date.fromisoformat(transaction.date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: {transaction.date}. Use YYYY-MM-DD."
            )

    # Auto-generate month from date
    month = transaction_date.strftime("%Y-%m")

    # Find category
    category = query_one(
        "SELECT id FROM budget_categories WHERE name = %s AND created_by = %s",
        (transaction.category_name, current_user.id)
    )

    # Create category if it doesn't exist
    if not category:
        # Determine category type based on transaction type
        cat_type = transaction.type.value
        category_id = str(uuid.uuid4())
        execute(
            """
            INSERT INTO budget_categories (id, name, type, icon, is_active, created_by)
            VALUES (%s, %s, %s, '📝', true, %s)
            RETURNING id
            """,
            (category_id, transaction.category_name, cat_type, current_user.id)
        )
    else:
        category_id = category["id"]

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
            Decimal(str(transaction.amount)),
            transaction.type.value,
            category_id,
            transaction.category_name,
            transaction.description,
            transaction_date,
            month,
            transaction.currency,
            transaction.is_recurring,
            recurring_group_id,
            transaction.recurring_day,
            current_user.id
        )
    )

    return TransactionResponse(**result)


@router.post("/goal", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_simple(
    goal: AIGoalCreate,
    current_user: User = Depends(get_current_user)
):
    """
    **AI-FRIENDLY ENDPOINT**: Create a savings goal with minimal input.

    **Example Request**:
    ```json
    {
        "name": "Emergency Fund",
        "target_amount": 10000,
        "current_amount": 2000,
        "deadline": "2024-12-31",
        "icon": "💰"
    }
    ```
    """
    goal_id = str(uuid.uuid4())

    # Parse deadline if provided
    deadline = None
    if goal.deadline:
        try:
            deadline = date.fromisoformat(goal.deadline)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: {goal.deadline}. Use YYYY-MM-DD."
            )

    # Check if completed
    is_completed = Decimal(str(goal.current_amount)) >= Decimal(str(goal.target_amount))

    result = execute(
        """
        INSERT INTO savings_goals (
            id, name, target_amount, current_amount, deadline, icon, currency, is_completed, created_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            goal_id,
            goal.name,
            Decimal(str(goal.target_amount)),
            Decimal(str(goal.current_amount)),
            deadline,
            goal.icon,
            goal.currency,
            is_completed,
            current_user.id
        )
    )

    return GoalResponse(**result)


@router.post("/investment", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
async def create_investment_simple(
    investment: AIInvestmentCreate,
    current_user: User = Depends(get_current_user)
):
    """
    **AI-FRIENDLY ENDPOINT**: Create an investment with minimal input.

    **Example Request**:
    ```json
    {
        "name": "Bitcoin",
        "type": "crypto",
        "initial_amount": 1000,
        "current_value": 1500,
        "notes": "Bought on Binance"
    }
    ```
    """
    investment_id = str(uuid.uuid4())

    # Parse purchase_date if provided
    purchase_date = date.today()
    if investment.purchase_date:
        try:
            purchase_date = date.fromisoformat(investment.purchase_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: {investment.purchase_date}. Use YYYY-MM-DD."
            )

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
            Decimal(str(investment.initial_amount)),
            Decimal(str(investment.current_value)),
            purchase_date,
            investment.notes,
            current_user.id
        )
    )

    return InvestmentResponse(**result)


@router.post("/goal/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: str,
    amount: float,
    current_user: User = Depends(get_current_user)
):
    """
    **AI-FRIENDLY ENDPOINT**: Add money to a savings goal.

    This is a convenience endpoint to quickly add contributions to a goal.
    Automatically marks the goal as completed if target is reached.
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


@router.get("/categories/suggest")
async def suggest_categories(
    current_user: User = Depends(get_current_user)
):
    """
    **AI-FRIENDLY ENDPOINT**: Get category suggestions based on common expenses/incomes.

    Returns a list of common category names and their typical types,
    helping AI assistants suggest appropriate categories for transactions.
    """
    existing = query(
        "SELECT name, type FROM budget_categories WHERE created_by = %s",
        (current_user.id,)
    )

    suggestions = {
        "income": [
            {"name": "Salary", "icon": "💰", "description": "Regular employment income"},
            {"name": "Freelance", "icon": "💻", "description": "Freelance or contract work"},
            {"name": "Investments", "icon": "📈", "description": "Dividends, interest, capital gains"},
            {"name": "Gifts", "icon": "🎁", "description": "Money received as gifts"},
            {"name": "Other Income", "icon": "💵", "description": "Other sources of income"},
        ],
        "expense": [
            {"name": "Food", "icon": "🍔", "description": "Groceries, restaurants, food delivery"},
            {"name": "Transport", "icon": "🚗", "description": "Gas, public transport, car maintenance"},
            {"name": "Housing", "icon": "🏠", "description": "Rent, mortgage, utilities"},
            {"name": "Entertainment", "icon": "🎬", "description": "Movies, games, streaming services"},
            {"name": "Health", "icon": "💊", "description": "Medicine, doctor visits, gym"},
            {"name": "Shopping", "icon": "🛒", "description": "Clothing, electronics, household items"},
            {"name": "Education", "icon": "📚", "description": "Courses, books, subscriptions"},
            {"name": "Personal", "icon": "💇", "description": "Haircuts, personal care"},
            {"name": "Subscriptions", "icon": "📱", "description": "Recurring monthly payments"},
            {"name": "Other Expense", "icon": "📝", "description": "Other expenses"},
        ]
    }

    existing_names = {c["name"] for c in existing}

    return {
        "existing_categories": existing,
        "suggested_categories": suggestions,
        "tip": "When creating a transaction, use the category_name from existing categories or suggest a new one from the suggestions above."
    }