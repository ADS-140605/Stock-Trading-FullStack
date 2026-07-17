from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.models.all_models import User, Stock, Wallet, Holding, Order, OrderSide, OrderStatus
from app.schemas.all_schemas import OrderCreate, OrderResponse
from app.routers.auth import get_current_user
from app.ws.manager import manager

router = APIRouter()

@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    skip: int = 0, limit: int = 100,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=OrderResponse)
async def place_order(order: OrderCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Need to execute atomically. We'll use the session to handle it.
    
    # 1. Fetch stock
    result = await db.execute(select(Stock).where(Stock.symbol == order.symbol))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    # 2. Fetch user's wallet with row-level lock (prevent race conditions)
    result = await db.execute(
        select(Wallet)
        .where(Wallet.user_id == current_user.id)
        .with_for_update()
    )
    wallet = result.scalar_one_or_none()
    
    # 3. Fetch user's holding for this stock with row-level lock
    result = await db.execute(
        select(Holding)
        .where(Holding.user_id == current_user.id, Holding.stock_id == stock.id)
        .with_for_update()
    )
    holding = result.scalar_one_or_none()
    
    total_value = stock.current_price * order.quantity
    
    new_order = Order(
        user_id=current_user.id,
        stock_id=stock.id,
        side=order.side,
        quantity=order.quantity,
        price_at_execution=stock.current_price,
        total_value=total_value,
        status=OrderStatus.FILLED
    )

    if order.side == OrderSide.BUY:
        if wallet.cash_balance < total_value:
            new_order.status = OrderStatus.REJECTED
            db.add(new_order)
            await db.commit()
            raise HTTPException(status_code=400, detail="Insufficient funds")
            
        wallet.cash_balance -= total_value
        wallet.updated_at = datetime.utcnow()
        
        if holding:
            # Update avg cost basis
            total_cost = (holding.quantity * holding.avg_cost_basis) + total_value
            holding.quantity += order.quantity
            holding.avg_cost_basis = total_cost / holding.quantity
        else:
            holding = Holding(user_id=current_user.id, stock_id=stock.id, quantity=order.quantity, avg_cost_basis=stock.current_price)
            db.add(holding)
            
    elif order.side == OrderSide.SELL:
        if not holding or holding.quantity < order.quantity:
            new_order.status = OrderStatus.REJECTED
            db.add(new_order)
            await db.commit()
            raise HTTPException(status_code=400, detail="Insufficient shares")
            
        wallet.cash_balance += total_value
        wallet.updated_at = datetime.utcnow()
        
        holding.quantity -= order.quantity
        if holding.quantity == 0:
            holding.avg_cost_basis = 0
            # Could also delete the holding record
            
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    
    # Broadcast personal message
    await manager.send_personal_message({
        "type": "order_filled",
        "data": {
            "order_id": new_order.id,
            "symbol": stock.symbol,
            "side": new_order.side.value,
            "quantity": new_order.quantity,
            "price": new_order.price_at_execution
        }
    }, current_user.username)
    
    return new_order
