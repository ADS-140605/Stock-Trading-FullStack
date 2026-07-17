import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarketProvider } from './context/MarketContext';
import Dashboard from './pages/Dashboard';
import Trade from './pages/Trade';
import Portfolio from './pages/Portfolio';
import History from './pages/History';

import { Toaster, toast } from 'react-hot-toast';

function AuthHeader() {
  const { user, login, signup, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        await signup(username, `${username}@test.com`, password);
        toast.success(`Welcome ${username}! Signup successful.`);
      } else {
        await login(username, password);
        toast.success(`Welcome back ${username}!`);
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    }
  };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Welcome, {user.username}</span>
        <button onClick={logout} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Logout</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'white' }} />
      <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'white' }} />
      <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', background: 'var(--accent-color)', color: 'white', cursor: 'pointer' }}>
        {isSignup ? 'Sign Up' : 'Login'}
      </button>
      <button type="button" onClick={() => setIsSignup(!isSignup)} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
        {isSignup ? 'Switch to Login' : 'Switch to Sign Up'}
      </button>
    </form>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <div className="logo">TradeVirtual</div>
          <nav className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/trade">Trade</Link>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/history">History</Link>
          </nav>
          <AuthHeader />
        </header>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MarketProvider>
        <Toaster position="top-center" toastOptions={{ style: { background: 'var(--bg-tertiary)', color: 'white' } }} />
        <MainApp />
      </MarketProvider>
    </AuthProvider>
  );
}
