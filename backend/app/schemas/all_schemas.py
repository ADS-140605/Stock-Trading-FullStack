from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.models.all_models import OrderSide, OrderType, OrderStatus

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class StockBase(BaseModel):
    symbol: str
    name: str
    current_price: float
    previous_close: float
    volatility: float

class StockResponse(StockBase):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    symbol: str
    side: OrderSide
    quantity: int = Field(gt=0)

class OrderResponse(BaseModel):
    id: int
    stock_id: int
    side: OrderSide
    order_type: OrderType
    quantity: int
    price_at_execution: Optional[float]
    total_value: Optional[float]
    status: OrderStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class HoldingResponse(BaseModel):
    stock_id: int
    symbol: str
    quantity: int
    avg_cost_basis: float
    current_value: float
    unrealized_pl: float
    model_config = ConfigDict(from_attributes=True)

class PortfolioResponse(BaseModel):
    cash_balance: float
    total_value: float
    holdings: List[HoldingResponse]
