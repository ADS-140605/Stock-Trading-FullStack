const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (res) => {
  if (res.ok) return res.json();
  const err = await res.json().catch(() => ({}));
  throw new Error(err.detail || 'api err');
};

const fetchApi = async (endpoint, options = {}) => 
  handleResponse(await fetch(`${API_BASE_URL}${endpoint}`, options));

export const api = {
  signup: (username, email, password) => 
    fetchApi('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) }),
    
  login: (username, password) => 
    fetchApi('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username, password }) }),

  getMe: () => fetchApi('/auth/me', { headers: getAuthHeader() }),
  getStocks: () => fetchApi('/stocks/'),
  getStockHistory: (sym, skip = 0, limit = 100) => fetchApi(`/stocks/${sym}/history?skip=${skip}&limit=${limit}`),
  getStockChart: (sym, period) => fetchApi(`/stocks/${sym}/chart?period=${period}`),
  getPortfolio: () => fetchApi('/portfolio/', { headers: getAuthHeader() }),
  getEquityCurve: () => fetchApi('/portfolio/equity_curve', { headers: getAuthHeader() }),
  
  placeOrder: (symbol, side, quantity) => 
    fetchApi('/orders/', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify({ symbol, side, quantity }) }),
    
  getOrders: (skip = 0, limit = 100) => fetchApi(`/orders/?skip=${skip}&limit=${limit}`, { headers: getAuthHeader() })
};
