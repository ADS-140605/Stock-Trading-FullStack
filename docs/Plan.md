# Virtual Stock Trading Platform — Architecture & Schema

**Stack:** React (frontend) + Node.js (BFF/WebSocket relay, optional) + FastAPI (backend) + SQLAlchemy + PostgreSQL

---

## 1. High-Level Architecture

```
┌─────────────────┐        WebSocket + REST        ┌──────────────────────┐
│   React (Vite)   │ ◄─────────────────────────────► │   FastAPI Backend    │
│   - Dashboard     │                                 │   - REST API          │
│   - Order forms   │        (Node.js BFF optional,   │   - WebSocket hub     │
│   - Portfolio      │        proxies WS + auth        │   - Simulation engine │
│   - Charts (Recharts) │     cookies if needed)      │   - Order matching     │
└─────────────────┘                                 └──────────┬───────────┘
                                                                  │ SQLAlchemy
                                                                  ▼
                                                         ┌────────────────┐
                                                         │  PostgreSQL     │
                                                         │  - users        │
                                                         │  - wallets      │
                                                         │  - stocks       │
                                                         │  - holdings     │
                                                         │  - orders       │
                                                         │  - price_ticks  │
                                                         └────────────────┘
```

**Why a Node.js layer is optional, not required:** FastAPI can serve REST + WebSocket directly to React with no intermediary. Add Node.js only if you want:
- Server-side rendering (Next.js)
- A BFF that aggregates calls or hides the FastAPI URL
- A separate WebSocket gateway for horizontal scaling (fan-out to many clients via Redis pub/sub)

For a clean demo, **React talks directly to FastAPI**. Mention the Node BFF as an optional "production hardening" layer in your writeup — it shows you understand the tradeoff without over-engineering the demo.

---

## 2. Database Schema (SQLAlchemy models, conceptually)

### `users`
| column | type | notes |
|---|---|---|
| id | UUID / serial PK | |
| email | string, unique | |
| hashed_password | string | bcrypt/argon2 |
| username | string, unique | |
| created_at | timestamp | |

### `wallets`
| column | type | notes |
|---|---|---|
| id | PK | |
| user_id | FK → users.id, unique | one wallet per user |
| cash_balance | numeric(18,2) | starts at 100000.00 |
| updated_at | timestamp | |

### `stocks`
| column | type | notes |
|---|---|---|
| id | PK | |
| symbol | string, unique | e.g. "SIMX" |
| name | string | e.g. "Simulated Corp" |
| current_price | numeric(12,4) | updated by simulation engine |
| previous_close | numeric(12,4) | for daily % change |
| volatility | numeric(6,4) | tunable parameter per stock |
| updated_at | timestamp | |

### `price_ticks` (time-series; consider partitioning or a separate TimescaleDB-style table if you want history)
| column | type | notes |
|---|---|---|
| id | PK (bigserial) | |
| stock_id | FK → stocks.id | |
| price | numeric(12,4) | |
| timestamp | timestamp, indexed | |

> For the demo, you can keep only the last N ticks per stock (e.g. last 200) in Postgres and hold the live "current price" in an in-memory dict for speed, syncing to DB periodically (e.g. every 5s) rather than on every tick. This avoids hammering Postgres with writes on every simulated price update.

### `holdings`
| column | type | notes |
|---|---|---|
| id | PK | |
| user_id | FK → users.id | |
| stock_id | FK → stocks.id | |
| quantity | integer | |
| avg_cost_basis | numeric(12,4) | weighted average buy price |
| unique constraint | (user_id, stock_id) | |

### `orders` (also serves as the transaction ledger)
| column | type | notes |
|---|---|---|
| id | PK | |
| user_id | FK → users.id | |
| stock_id | FK → stocks.id | |
| side | enum('BUY','SELL') | |
| order_type | enum('MARKET') | extend to LIMIT later if desired |
| quantity | integer | |
| price_at_execution | numeric(12,4) | snapshot of price when filled |
| total_value | numeric(18,2) | quantity × price |
| status | enum('FILLED','REJECTED') | market orders fill instantly or reject |
| created_at | timestamp | |

Relationships: `User 1—1 Wallet`, `User 1—N Holdings`, `User 1—N Orders`, `Stock 1—N Holdings`, `Stock 1—N Orders`, `Stock 1—N PriceTicks`.

---

## 3. Simulation Engine Design

Run as an `asyncio` background task started in FastAPI's lifespan event, not a request handler.

**Price model options (pick one, mention alternatives in your README):**
- **Geometric Brownian Motion (GBM):** `price_t+1 = price_t * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)` where `Z ~ N(0,1)`. Standard for stock simulations, easy to tune realism via `mu`/`sigma`.
- **Mean-reverting (Ornstein-Uhlenbeck):** keeps prices oscillating around a baseline, good if you want a "boring but stable" demo stock alongside volatile ones.

**Loop structure:**
```
every TICK_INTERVAL (e.g. 1-2 sec):
    for each stock:
        compute new price via GBM
        update in-memory current_price
        broadcast {symbol, price, change%, timestamp} over WebSocket to all subscribed clients
    every SYNC_INTERVAL (e.g. 5-10 sec):
        bulk-write current prices to price_ticks + update stocks.current_price
```

Keep the simulation stock list small (5–15 tickers) — enough to demonstrate breadth without noisy UI.

---

## 4. WebSocket Protocol

Single endpoint: `ws://.../ws/market`

**Server → Client messages:**
```json
{ "type": "price_update", "data": [{"symbol": "SIMX", "price": 142.31, "change_pct": 0.82}, ...] }
{ "type": "portfolio_update", "data": {"total_value": 104213.55, "cash": 82000.00, "holdings": [...]} }
{ "type": "order_filled", "data": {"order_id": 55, "symbol": "SIMX", "side": "BUY", "quantity": 10, "price": 142.31} }
```

**Client → Server** (optional, if you want subscription filtering):
```json
{ "type": "subscribe", "symbols": ["SIMX", "TECHZ"] }
```

Use a `ConnectionManager` class in FastAPI to track active WebSocket connections per user (so portfolio_update/order_filled go only to the relevant user, while price_update broadcasts to everyone).

---

## 5. REST API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | create user + wallet (seeded with virtual cash) |
| POST | `/auth/login` | returns JWT |
| GET | `/stocks` | list all simulated stocks + current prices |
| GET | `/stocks/{symbol}/history` | recent price ticks for charting |
| GET | `/portfolio` | current holdings, cash balance, total value, unrealized P&L |
| GET | `/orders` | user's transaction history |
| POST | `/orders` | place a market order `{symbol, side, quantity}` — validates funds/shares, executes at current price, updates wallet + holdings atomically |
| GET | `/me` | current user profile |

**Order execution (critical correctness point):** wrap the balance check, wallet debit/credit, holdings update, and order insert in a **single DB transaction** (`session.begin()`), and re-fetch the current price inside that transaction to avoid race conditions between concurrent orders.

---

## 6. Frontend Structure (React)

```
src/
  api/            # axios/fetch wrappers for REST
  ws/             # WebSocket hook (useMarketSocket)
  pages/
    Dashboard.jsx     # live prices, watchlist
    Trade.jsx          # buy/sell form
    Portfolio.jsx       # holdings + P&L
    History.jsx          # order/transaction log
  components/
    PriceTicker.jsx
    StockChart.jsx       # Recharts line chart fed by price_ticks
    OrderForm.jsx
    HoldingsTable.jsx
  context/
    AuthContext.jsx
    PortfolioContext.jsx  # holds live state updated via WS
```

Use a single WebSocket hook that updates React context/state, so any component can subscribe to live prices without prop drilling.

---

## 7. Suggested Build Order

1. Postgres schema + SQLAlchemy models + Alembic migrations
2. Auth (signup/login/JWT)
3. Static stock CRUD + seed data
4. Simulation engine (log prices to console first, no WebSocket yet)
5. WebSocket broadcast of prices
6. Order placement endpoint with transactional wallet/holdings logic
7. Portfolio calculation endpoint
8. React: price ticker + chart wired to WebSocket
9. React: trade form + portfolio view
10. Polish: order history, P&L coloring, reconnect logic on WS drop

---

## 8. Things Worth Calling Out in a Demo/README

- Explain the GBM model choice and parameters — shows quant awareness.
- Explain the transactional integrity of order execution — shows backend rigor.
- Explain why price ticks are batched to DB rather than written every tick — shows scaling awareness.
- Mention horizontal scaling path (Redis pub/sub for WebSocket fan-out) as a "next step," not built.
