import asyncio
import random
import math
from datetime import datetime
from sqlalchemy.future import select
from app.db.database import async_session
from app.models.all_models import Stock, PriceTick
from app.ws.manager import manager

# Geometric Brownian Motion simulation
async def run_simulation():
    while True:
        try:
            async with async_session() as session:
                result = await session.execute(select(Stock))
                stocks = result.scalars().all()

                price_updates = []
                for stock in stocks:
                    # Trend-Based Micro-fluctuation
                    # We want prices to fluctuate realistically around the current state
                    # We use a very small volatility since real NSE stocks don't jump 2% every 2 seconds
                    sigma = stock.volatility / 10.0 # Scale down for 2-second ticks
                    
                    # Compute new price
                    Z = random.gauss(0, 1)
                    # No fixed drift, we want it to randomly walk but stay somewhat anchored
                    shock = sigma * Z
                    
                    new_price = stock.current_price * math.exp(shock)
                    # Round to 2 decimal places which is standard for INR stocks
                    new_price = max(0.05, round(new_price, 2))
                    
                    change_pct = ((new_price - stock.previous_close) / stock.previous_close) * 100
                    
                    # Update stock price in DB
                    stock.current_price = new_price
                    stock.updated_at = datetime.utcnow()
                    
                    # Prepare update message
                    price_updates.append({
                        "symbol": stock.symbol,
                        "price": new_price,
                        "change_pct": round(change_pct, 2)
                    })
                    
                    # For a real system we'd batch price_ticks insert instead of saving every single tick
                    # But for MVP we will log the tick directly if we have few stocks
                    tick = PriceTick(stock_id=stock.id, price=new_price)
                    session.add(tick)
                
                await session.commit()
                
                # Broadcast new prices via WebSocket
                if price_updates:
                    await manager.broadcast({
                        "type": "price_update",
                        "data": price_updates
                    })
                    
        except Exception as e:
            print(f"Simulation engine error: {e}")
        
        await asyncio.sleep(2) # Run every 2 seconds
