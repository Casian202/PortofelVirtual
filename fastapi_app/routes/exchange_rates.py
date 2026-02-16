"""
Exchange rates routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from models import ExchangeRateCreate, ExchangeRateUpdate, ExchangeRateResponse, MessageResponse
from auth import get_current_user, require_admin, User
from database import query, query_one, execute

router = APIRouter(prefix="/exchange-rates", tags=["Exchange Rates"])


@router.get("", response_model=List[ExchangeRateResponse])
async def list_exchange_rates(current_user: User = Depends(get_current_user)):
    """
    List all exchange rates.

    Exchange rates are relative to RON (Romanian Leu).
    For example, if EUR rate is 4.97, then 1 EUR = 4.97 RON.
    """
    rates = query(
        """
        SELECT id, currency, rate, updated_at, updated_by
        FROM exchange_rates
        ORDER BY currency
        """
    )
    return [ExchangeRateResponse(**r) for r in rates]


@router.post("", response_model=ExchangeRateResponse, status_code=status.HTTP_201_CREATED)
async def create_exchange_rate(
    rate: ExchangeRateCreate,
    admin: User = Depends(require_admin)
):
    """
    Add a new currency exchange rate. Admin only.

    - **currency**: 3-letter currency code (e.g., 'EUR', 'USD', 'GBP')
    - **rate**: Exchange rate relative to RON (e.g., 4.97 for EUR)
    """
    existing = query_one(
        "SELECT id FROM exchange_rates WHERE currency = %s",
        (rate.currency.upper(),)
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exchange rate for '{rate.currency}' already exists. Use PUT to update."
        )

    result = execute(
        """
        INSERT INTO exchange_rates (currency, rate, updated_by)
        VALUES (%s, %s, %s)
        RETURNING id, currency, rate, updated_at, updated_by
        """,
        (rate.currency.upper(), rate.rate, admin.id)
    )

    return ExchangeRateResponse(**result)


@router.put("/{currency}", response_model=ExchangeRateResponse)
async def update_exchange_rate(
    currency: str,
    rate: ExchangeRateUpdate,
    admin: User = Depends(require_admin)
):
    """
    Update an exchange rate. Admin only.

    - **currency**: 3-letter currency code
    - **rate**: New exchange rate relative to RON
    """
    result = execute(
        """
        UPDATE exchange_rates
        SET rate = %s, updated_at = NOW(), updated_by = %s
        WHERE currency = %s
        RETURNING id, currency, rate, updated_at, updated_by
        """,
        (rate.rate, admin.id, currency.upper())
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exchange rate for '{currency}' not found"
        )

    return ExchangeRateResponse(**result)


@router.delete("/{currency}", response_model=MessageResponse)
async def delete_exchange_rate(
    currency: str,
    admin: User = Depends(require_admin)
):
    """
    Delete an exchange rate. Admin only.
    """
    result = execute(
        "DELETE FROM exchange_rates WHERE currency = %s RETURNING id",
        (currency.upper(),)
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exchange rate for '{currency}' not found"
        )

    return MessageResponse(message=f"Exchange rate for '{currency}' deleted successfully")