# 📈 VirtuTrade — Real-Time Virtual Stock Trading Platform

A full-stack simulation platform where users trade with virtual money against a live, simulated stock market. Built to demonstrate a modern React frontend, a Python (FastAPI + SQLAlchemy) backend, real-time data via WebSockets, and PostgreSQL-backed persistence.

---

## ✨ Features

- **Real-time market simulation** — prices for a basket of simulated stocks update continuously using a stochastic price model (Geometric Brownian Motion), streamed live over WebSockets.
- **Virtual portfolio** — every user starts with virtual cash and can buy/sell simulated stocks at live prices.
- **Instant order execution** — market orders fill immediately against the current simulated price, with full transactional integrity (no race conditions on concurrent trades).
- **Live portfolio tracking** — real-time unrealized P&L, cash balance, and total portfolio value as prices move.
- **Transaction history** — full ledger of every trade a user has made.
- **JWT authentication** — signup/login with hashed passwords.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Recharts, WebSocket API |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Real-time transport | WebSockets |
| Auth | JWT (OAuth2 password flow) |

> See [`stock-trading-platform-architecture.md`](./stock-trading-platform-architecture.md) for full schema, API, and simulation engine design.

---

## 📂 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entrypoint, lifespan events
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── routers/                # auth, stocks, orders, portfolio
│   │   ├── services/
│   │   │   ├── simulation.py       # price simulation engine (asyncio task)
│   │   │   └── order_engine.py       # transactional order execution
│   │   ├── ws/
│   │   │   └── connection_manager.py # WebSocket connection tracking
│   │   ├── db.py                    # SQLAlchemy engine/session setup
│   │   └── config.py                 # env-based settings
│   ├── alembic/                       # DB migrations
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/           # REST client wrappers
│   │   ├── ws/             # WebSocket hook
│   │   ├── pages/           # Dashboard, Trade, Portfolio, History
│   │   ├── components/       # PriceTicker, StockChart, OrderForm, HoldingsTable
│   │   └── context/           # AuthContext, PortfolioContext
│   ├── package.json
│   └── .env.example
│
└── stock-trading-platform-architecture.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and configure environment

```bash
git clone <your-repo-url>
cd virtutrade
```

Create `backend/.env` from the example:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/virtutrade
SECRET_KEY=change-me-to-a-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=60
STARTING_CASH_BALANCE=100000.00
TICK_INTERVAL_SECONDS=2
```

Create `frontend/.env` from the example:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/market
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# create the database
createdb virtutrade

# run migrations
alembic upgrade head

# (optional) seed simulated stocks
python -m app.scripts.seed_stocks

# run the API + simulation engine
uvicorn app.main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be live at `http://localhost:5173`.

---

## 🔌 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register a new user (seeds a wallet with starting cash) |
| POST | `/auth/login` | Log in, returns a JWT |
| GET | `/stocks` | List simulated stocks with current prices |
| GET | `/stocks/{symbol}/history` | Recent price history for a stock |
| GET | `/portfolio` | Current holdings, cash balance, total value, P&L |
| GET | `/orders` | Transaction history |
| POST | `/orders` | Place a market buy/sell order |
| WS | `/ws/market` | Live price ticks, portfolio updates, order fill events |

Full request/response shapes are documented in the architecture doc and auto-generated Swagger UI at `/docs`.

---

## 🧪 Running Tests

```bash
# backend
cd backend
pytest

# frontend
cd frontend
npm run test
```

---

## 🗺️ Roadmap / Ideas for Extension

- [ ] Limit orders and order book simulation
- [ ] Multiple simulated market "regimes" (bull/bear/volatile) toggleable by an admin
- [ ] Leaderboard of top virtual portfolios
- [ ] Historical candlestick charts
- [ ] Redis pub/sub for WebSocket horizontal scaling
- [ ] Dockerized deployment (`docker-compose up`)

---

## 📄 License

MIT — feel free to fork and use this as a learning project or portfolio piece.
