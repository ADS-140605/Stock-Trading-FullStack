from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import asyncio
import yfinance as yf
import time
import logging

from app.db.database import get_db
from app.models.all_models import Stock, PriceTick
from app.schemas.all_schemas import StockResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[StockResponse])
async def get_stocks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock))
    stocks = result.scalars().all()
    return stocks

@router.get("/{symbol}/history")
async def get_stock_history(symbol: str, skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    # Get stock
    result = await db.execute(select(Stock).where(Stock.symbol == symbol))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    # Get ticks
    result = await db.execute(
        select(PriceTick)
        .where(PriceTick.stock_id == stock.id)
        .order_by(PriceTick.timestamp.desc())
        .offset(skip)
        .limit(limit)
    )
    ticks = result.scalars().all()
    
    # Return ascending order for charts
    ticks.reverse()
    return [{"timestamp": t.timestamp, "price": t.price} for t in ticks]

# Simple in-memory cache to prevent yfinance rate limiting
# Format: { "SYMBOL_PERIOD": { "time": timestamp, "data": [...] } }
chart_cache = {}

@router.get("/{symbol}/chart")
async def get_stock_chart(symbol: str, period: str = "1mo"):
    # period can be '1d', '1mo', '1y', '5y', 'max'
    cache_key = f"{symbol}_{period}"
    
    if cache_key in chart_cache:
        # 1 hour TTL for historical, 1 min TTL for 1d
        ttl = 60 if period == "1d" else 3600
        if time.time() - chart_cache[cache_key]["time"] < ttl:
            return chart_cache[cache_key]["data"]
            
    try:
        def fetch_data():
            ticker = yf.Ticker(symbol)
            interval = "1d"
            if period == "1d":
                interval = "1m"
            elif period == "1mo" or period == "1y":
                interval = "1d"
            elif period == "5y":
                interval = "1wk"
            elif period == "max":
                interval = "1mo"
                
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                return []
                
            df = df.dropna()
                
            data = []
            for index, row in df.iterrows():
                # For candlesticks we need [Open, High, Low, Close]
                data.append({
                    "x": index.isoformat(),
                    "y": [
                        round(row["Open"], 2),
                        round(row["High"], 2),
                        round(row["Low"], 2),
                        round(row["Close"], 2)
                    ]
                })
            return data
            
        data = await asyncio.to_thread(fetch_data)
        chart_cache[cache_key] = { "time": time.time(), "data": data }
        return data
        
    except Exception as e:
        logging.error(f"Error fetching chart for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching historical data")
