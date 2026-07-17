import asyncio
from sqlalchemy.future import select
from app.db.database import init_db, async_session
from app.models.all_models import Stock
import yfinance as yf
import math

async def add_nifty():
    await init_db()
    async with async_session() as session:
        result = await session.execute(select(Stock).where(Stock.symbol == "^NSEI"))
        if not result.scalar_one_or_none():
            try:
                ticker = yf.Ticker("^NSEI")
                hist = ticker.history(period="5d")
                c1, c2 = float(hist['Close'].iloc[-2]), float(hist['Close'].iloc[-1])
                if math.isnan(c1): c1 = 24000.0
                if math.isnan(c2): c2 = c1
            except Exception as e:
                print("Error:", e)
                c1, c2 = 24000.0, 24000.0
            
            nifty = Stock(symbol="^NSEI", name="NIFTY 50", current_price=c2, previous_close=c1, volatility=0.005)
            session.add(nifty)
            await session.commit()
            print("Added NIFTY 50 to the database!")
        else:
            print("NIFTY 50 already exists!")

if __name__ == "__main__":
    asyncio.run(add_nifty())
