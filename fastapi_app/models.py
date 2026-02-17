"""
Pydantic models for request/response validation.
These models represent the database schema and API contracts.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from enum import Enum


# ============================================
# ENUMS
# ============================================

class TransactionType(str, Enum):
    """Transaction type enum."""
    INCOME = "income"
    EXPENSE = "expense"


class SortOrder(str, Enum):
    """Sort order enum."""
    ASC = "asc"
    DESC = "desc"


# ============================================
# USER MODELS
# ============================================

class UserBase(BaseModel):
    """Base user model."""
    email: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation model."""
    password: str


class UserResponse(UserBase):
    """User response model."""
    id: str
    role: str = "user"
    must_change_password: bool = False
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Login request model."""
    email: str
    password: str


class LoginResponse(BaseModel):
    """Login response model."""
    token: str
    user: UserResponse


class PasswordChangeRequest(BaseModel):
    """Password change request model."""
    current_password: str
    new_password: str


# ============================================
# CATEGORY MODELS
# ============================================

class CategoryBase(BaseModel):
    """Base category model."""
    name: str
    type: TransactionType
    icon: Optional[str] = "💡"
    color: Optional[str] = None
    is_active: Optional[bool] = True


class CategoryCreate(CategoryBase):
    """Category creation model."""
    pass


class CategoryUpdate(BaseModel):
    """Category update model - all fields optional."""
    name: Optional[str] = None
    type: Optional[TransactionType] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    """Category response model."""
    id: str
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# TRANSACTION MODELS
# ============================================

class TransactionBase(BaseModel):
    """Base transaction model."""
    amount: Decimal = Field(..., gt=0, description="Amount must be positive")
    type: TransactionType
    category_id: Optional[str] = None
    category_name: str
    description: Optional[str] = None
    date: date
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format")
    currency: Optional[str] = "RON"
    is_recurring: Optional[bool] = False
    recurring_day: Optional[int] = Field(None, ge=1, le=31, description="Day of month for recurring")


class TransactionCreate(TransactionBase):
    """Transaction creation model."""
    pass


class TransactionUpdate(BaseModel):
    """Transaction update model - all fields optional."""
    amount: Optional[Decimal] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[date] = None
    month: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")
    currency: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_day: Optional[int] = Field(None, ge=1, le=31)


class TransactionResponse(TransactionBase):
    """Transaction response model."""
    id: str
    recurring_group_id: Optional[str] = None
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None
    is_meal_voucher: bool = False

    class Config:
        from_attributes = True


class MealVoucherTransaction(BaseModel):
    """Model for creating meal voucher transactions."""
    amount: Decimal = Field(..., gt=0, description="Amount in RON")
    type: Literal["income", "expense"]
    category_name: str
    description: Optional[str] = None
    date: Optional[date] = None
    is_recurring: bool = Field(default=True, description="Meal vouchers are typically monthly recurring")
    recurring_day: Optional[int] = Field(default=15, ge=1, le=31, description="Day of month for recurring")


class MealVoucherReceiveRequest(BaseModel):
    """Request model for receiving meal vouchers."""
    amount: Decimal = Field(..., gt=0, description="Amount in RON")
    description: Optional[str] = Field(None, description="Optional description")
    transaction_date: Optional[date] = Field(None, description="Date of receipt (defaults to today)")
    is_recurring: bool = Field(default=True, description="Whether this is a recurring monthly income")


class MealVoucherSpendRequest(BaseModel):
    """Request model for spending meal vouchers."""
    amount: Decimal = Field(..., gt=0, description="Amount in RON")
    description: Optional[str] = Field(None, description="Optional description")
    transaction_date: Optional[date] = Field(None, description="Date of spending (defaults to today)")


class MealVoucherResponse(TransactionResponse):
    """Response model for meal voucher transactions."""
    pass


# ============================================
# INVESTMENT MODELS
# ============================================

class InvestmentBase(BaseModel):
    """Base investment model."""
    name: str
    type: str
    initial_amount: Decimal = Field(..., gt=0)
    current_value: Decimal = Field(..., ge=0)
    purchase_date: date
    notes: Optional[str] = None


class InvestmentCreate(InvestmentBase):
    """Investment creation model."""
    pass


class InvestmentUpdate(BaseModel):
    """Investment update model - all fields optional."""
    name: Optional[str] = None
    type: Optional[str] = None
    initial_amount: Optional[Decimal] = Field(None, gt=0)
    current_value: Optional[Decimal] = Field(None, ge=0)
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class InvestmentResponse(InvestmentBase):
    """Investment response model."""
    id: str
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# SAVINGS GOAL MODELS
# ============================================

class GoalBase(BaseModel):
    """Base savings goal model."""
    name: str
    target_amount: Decimal = Field(..., gt=0)
    current_amount: Optional[Decimal] = Field(default=Decimal("0"), ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = "🎯"
    color: Optional[str] = None
    currency: Optional[str] = "RON"


class GoalCreate(GoalBase):
    """Goal creation model."""
    pass


class GoalUpdate(BaseModel):
    """Goal update model - all fields optional."""
    name: Optional[str] = None
    target_amount: Optional[Decimal] = Field(None, gt=0)
    current_amount: Optional[Decimal] = Field(None, ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_completed: Optional[bool] = None
    currency: Optional[str] = None


class GoalResponse(GoalBase):
    """Goal response model."""
    id: str
    is_completed: bool = False
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# EXCHANGE RATE MODELS
# ============================================

class ExchangeRateBase(BaseModel):
    """Base exchange rate model."""
    currency: str = Field(..., min_length=3, max_length=3, description="3-letter currency code")
    rate: Decimal = Field(..., gt=0, description="Exchange rate relative to RON")


class ExchangeRateCreate(ExchangeRateBase):
    """Exchange rate creation model."""
    pass


class ExchangeRateUpdate(BaseModel):
    """Exchange rate update model."""
    rate: Decimal = Field(..., gt=0)


class ExchangeRateResponse(ExchangeRateBase):
    """Exchange rate response model."""
    id: int
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# WALLET / SUMMARY MODELS
# ============================================

class MonthlySummary(BaseModel):
    """Monthly summary model."""
    month: str
    total_income: Decimal
    total_expenses: Decimal
    net_savings: Decimal
    cumulative_savings: Decimal
    transaction_count: int


class WalletBalance(BaseModel):
    """Wallet balance model."""
    currency: str
    total_income: Decimal
    total_expenses: Decimal
    balance: Decimal
    transaction_count: int


class WalletSummaryResponse(BaseModel):
    """Wallet summary response."""
    balances: List[WalletBalance]
    monthly_summaries: List[MonthlySummary]
    total_balance_ron: Decimal


class MealVoucherBalance(BaseModel):
    """Meal voucher balance model."""
    balance: Decimal
    total_income: Decimal
    total_expense: Decimal


# ============================================
# API RESPONSE WRAPPERS
# ============================================

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str
    success: bool = False


class RecurringGenerateRequest(BaseModel):
    """Request to generate recurring transactions for a month."""
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format")


class RecurringGenerateResponse(BaseModel):
    """Response for recurring transaction generation."""
    message: str
    created_count: int
    created_transactions: List[TransactionResponse]


# ============================================
# AI-FRIENDLY MODELS (for OpenWebUI integration)
# ============================================

class AIDataSummary(BaseModel):
    """
    Complete data summary for AI consumption.
    Provides all user data in a structured, easy-to-understand format.
    """
    user: UserResponse
    categories: List[CategoryResponse]
    transactions: List[TransactionResponse]
    investments: List[InvestmentResponse]
    goals: List[GoalResponse]
    exchange_rates: List[ExchangeRateResponse]
    wallet_summary: WalletSummaryResponse

    class Config:
        json_schema_extra = {
            "example": {
                "user": {
                    "id": "uuid",
                    "email": "user@example.com",
                    "full_name": "John Doe",
                    "role": "user"
                },
                "categories": [
                    {
                        "id": "uuid",
                        "name": "Salary",
                        "type": "income",
                        "icon": "💰",
                        "color": "#4CAF50"
                    }
                ],
                "transactions": [
                    {
                        "id": "uuid",
                        "amount": "5000.00",
                        "type": "income",
                        "category_name": "Salary",
                        "description": "Monthly salary",
                        "date": "2024-01-15",
                        "month": "2024-01",
                        "currency": "RON"
                    }
                ],
                "investments": [
                    {
                        "id": "uuid",
                        "name": "Bitcoin",
                        "type": "crypto",
                        "initial_amount": "1000.00",
                        "current_value": "1500.00",
                        "purchase_date": "2023-01-01"
                    }
                ],
                "goals": [
                    {
                        "id": "uuid",
                        "name": "Emergency Fund",
                        "target_amount": "10000.00",
                        "current_amount": "5000.00",
                        "is_completed": False
                    }
                ],
                "exchange_rates": [
                    {"currency": "EUR", "rate": "4.97"},
                    {"currency": "USD", "rate": "4.58"}
                ],
                "wallet_summary": {
                    "total_balance_ron": "15000.00",
                    "balances": [
                        {"currency": "RON", "balance": "10000.00"},
                        {"currency": "EUR", "balance": "1000.00"}
                    ]
                }
            }
        }


class AITransactionCreate(BaseModel):
    """
    Simplified transaction creation model for AI.
    Provides helpful defaults and flexible input.
    """
    amount: float = Field(..., gt=0, description="Transaction amount (positive number)")
    type: TransactionType = Field(..., description="'income' or 'expense'")
    category_name: str = Field(..., description="Category name (e.g., 'Salary', 'Food', 'Transport')")
    description: Optional[str] = Field(None, description="Optional description of the transaction")
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format. Defaults to today.")
    currency: str = Field(default="RON", description="Currency code (default: RON)")
    is_recurring: bool = Field(default=False, description="Is this a recurring monthly transaction?")
    recurring_day: Optional[int] = Field(None, ge=1, le=31, description="Day of month for recurring (1-31)")
    is_meal_voucher: bool = Field(default=False, description="Is this a meal voucher transaction? Meal voucher expenses can only be for food category.")

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "amount": 150.50,
                    "type": "expense",
                    "category_name": "Food",
                    "description": "Weekly groceries"
                },
                {
                    "amount": 5000,
                    "type": "income",
                    "category_name": "Salary",
                    "description": "Monthly salary",
                    "is_recurring": True,
                    "recurring_day": 1
                }
            ]
        }


class AIGoalCreate(BaseModel):
    """
    Simplified goal creation model for AI.
    """
    name: str = Field(..., description="Goal name (e.g., 'Emergency Fund', 'Vacation')")
    target_amount: float = Field(..., gt=0, description="Target amount to save")
    current_amount: float = Field(default=0, ge=0, description="Current saved amount (default: 0)")
    deadline: Optional[str] = Field(None, description="Target deadline in YYYY-MM-DD format")
    icon: str = Field(default="🎯", description="Emoji icon for the goal")
    currency: str = Field(default="RON", description="Currency code")

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "name": "Emergency Fund",
                    "target_amount": 10000,
                    "current_amount": 2000,
                    "deadline": "2024-12-31"
                },
                {
                    "name": "Summer Vacation",
                    "target_amount": 3000,
                    "icon": "🏖️"
                }
            ]
        }


class AIInvestmentCreate(BaseModel):
    """
    Simplified investment creation model for AI.
    """
    name: str = Field(..., description="Investment name (e.g., 'Bitcoin', 'Apple Stock')")
    type: str = Field(..., description="Investment type (e.g., 'crypto', 'stocks', 'bonds')")
    initial_amount: float = Field(..., gt=0, description="Initial investment amount")
    current_value: float = Field(..., ge=0, description="Current value of investment")
    purchase_date: Optional[str] = Field(None, description="Purchase date in YYYY-MM-DD format. Defaults to today.")
    notes: Optional[str] = Field(None, description="Additional notes about the investment")

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "name": "Bitcoin",
                    "type": "crypto",
                    "initial_amount": 1000,
                    "current_value": 1500
                },
                {
                    "name": "S&P 500 ETF",
                    "type": "stocks",
                    "initial_amount": 5000,
                    "current_value": 5500,
                    "notes": "Index fund for long-term growth"
                }
            ]
        }