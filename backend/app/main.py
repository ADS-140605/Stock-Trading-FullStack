import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select
import uvicorn

from app.db.database import init_db, async_session
from app.models.all_models import Stock
from app.routers import auth, stocks, orders, portfolio
from app.services.simulation import run_simulation
from app.ws.manager import manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    async with async_session() as session: # seed initial data
        result = await session.execute(select(Stock))
        existing_stocks = result.scalars().all()
        if not existing_stocks:
            import yfinance as yf
            
            tickers = {
                "^NSEI": "NIFTY 50",
                "RELIANCE.NS": "Reliance Industries",
                "TCS.NS": "Tata Consultancy Services",
                "HDFCBANK.NS": "HDFC Bank",
                "INFY.NS": "Infosys",
                "ICICIBANK.NS": "ICICI Bank",
                "SBIN.NS": "State Bank of India",
                "BHARTIARTL.NS": "Bharti Airtel",
                "ITC.NS": "ITC Limited",
                "LT.NS": "Larsen & Toubro",
                "BAJFINANCE.NS": "Bajaj Finance",
                "HINDUNILVR.NS": "Hindustan Unilever",
                "AXISBANK.NS": "Axis Bank",
                "KOTAKBANK.NS": "Kotak Mahindra Bank",
                "MARUTI.NS": "Maruti Suzuki",
                "TATAMOTORS.NS": "Tata Motors"
            }
            initial_stocks = []
            
            def fetch_data(symbol):
                import math
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d")
                if len(hist) >= 2:
                    c1, c2 = float(hist['Close'].iloc[-2]), float(hist['Close'].iloc[-1])
                    if math.isnan(c1): c1 = 100.0
                    if math.isnan(c2): c2 = c1
                    return c1, c2
                return 100.0, 100.0

            for symbol, name in tickers.items():
                try:
                    prev_close, curr_price = await asyncio.to_thread(fetch_data, symbol)
                    initial_stocks.append(Stock(symbol=symbol, name=name, current_price=curr_price, previous_close=prev_close, volatility=0.005))
                except Exception as e:
                    print(f"Failed to fetch {symbol}: {e}")
                    initial_stocks.append(Stock(symbol=symbol, name=name, current_price=100.0, previous_close=99.0, volatility=0.015))
            
            session.add_all(initial_stocks)
            await session.commit()
            
    task = asyncio.create_task(run_simulation()) # spin up sim engine
    yield
    task.cancel() # cleanup

app = FastAPI(title="Virtual Stock Trading Platform API", lifespan=lifespan)

# cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])

@app.websocket("/ws/market")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    username = token or "anonymous" # auth stub
    await manager.connect(websocket, username)
    try:
        while True:
            _ = await websocket.receive_text() # keep-alive
    except WebSocketDisconnect:
        manager.disconnect(websocket, username)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
