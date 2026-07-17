# Virtual Stock Trading Platform

A fully functional, real-time virtual stock trading platform built with a React (Vite) frontend and a FastAPI backend. This platform features live price simulations, instant order execution, and real-time portfolio tracking without requiring any external market data subscriptions.

## Features

- **Live Market Data:** Watch stock prices fluctuate in real-time. The platform uses a Hybrid Trend-Based engine that fetches the true, real-world price of major NSE stocks (e.g. Reliance, TCS) on startup using `yfinance`, and then simulates realistic intra-day micro-fluctuations around that price to stream live updates via WebSockets without hitting API limits.
- **Instant Trading:** Execute market BUY and SELL orders instantly. The backend handles atomic transactions to ensure your virtual cash and share balances are strictly maintained.
- **Portfolio Management:** Track your cash balance, total portfolio value, and unrealized profit & loss (P&L) across all your holdings.
- **Order History:** Keep a detailed ledger of all your executed trades.
- **Minimalist UI:** A sleek, human-coded interface built with Vanilla CSS variables and Flexbox/Grid layouts.

---

## 🚀 Quick Start Guide

### 1. Backend Setup

The backend uses FastAPI and SQLAlchemy. By default, it runs on an SQLite database (`trading.db`) so you don't need a heavy PostgreSQL instance to try it out.

1. Open a terminal and navigate to the `backend` folder.
2. Activate your virtual environment (or create one):
   ```bash
   # Windows
   .venv\Scripts\activate
   # Mac/Linux
   source .venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will automatically seed the database with initial stocks and start the simulation engine.*

### 2. Frontend Setup

The frontend is a React application built with Vite.

1. Open a new terminal and navigate to the `frontend` folder.
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`.

---

## 📖 How to Use the Platform

### 1. Sign Up & Login
When you first load the platform, you will be in "view-only" mode. You must create an account to start trading.
1. Look at the top right of the navigation bar. You will see a login form.
2. Click the **"Switch to Sign Up"** button.
3. Enter your desired **Username** and **Password** and click **Sign Up**.
4. *Note: Upon successful sign-up, you will be automatically logged in and granted a starting virtual cash balance of **$100,000.00**.*

### 2. Viewing the Market (Dashboard)
Navigate to the **Dashboard** tab. You will see a grid of all available stocks.
- The prices will flash and update automatically every few seconds.
- You can monitor the daily percentage change (shown in green `▲` or red `▼`).

### 3. Placing a Trade
Navigate to the **Trade** tab to buy or sell stocks.
1. **Select a Stock:** Choose the company you wish to trade from the dropdown menu.
2. **Choose Side:** Select **BUY** or **SELL**.
3. **Quantity:** Enter the number of shares you want to trade. The system will automatically calculate the *Estimated Total* based on the live WebSocket price.
4. Click **Place Order**.
5. *If you attempt to buy more than your cash allows, or sell more shares than you own, the transaction will be rejected.*

### 4. Tracking Your Portfolio
Navigate to the **Portfolio** tab.
- At the top, you will see your available **Cash Balance** and your **Total Portfolio Value** (Cash + live value of all stock holdings).
- The table below lists all the stocks you own, showing your *Average Cost*, the *Current Price*, and your *Unrealized P&L* (profit or loss).

### 5. Order History
Navigate to the **History** tab.
- This serves as your transaction ledger, detailing the exact time, price, and quantity of every order you have placed.

---

## Technical Stack

- **Frontend:** React 18, Vite, React Router, Vanilla CSS.
- **Backend:** Python 3.11, FastAPI, SQLAlchemy, Uvicorn, WebSockets.
- **Database:** SQLite (default) with `aiosqlite`. Easily configurable to use PostgreSQL by updating the `DATABASE_URL` environment variable.
- **Security:** JWT Authentication, Bcrypt Password Hashing.
