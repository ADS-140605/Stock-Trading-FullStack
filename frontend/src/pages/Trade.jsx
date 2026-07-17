import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Trade() {
  const { prices } = useMarket();
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [side, setSide] = useState('BUY');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stockData = await api.getStocks();
        setStocks(stockData);
        if (stockData.length > 0) setSelectedSymbol(stockData[0].symbol);
        
        if (user) {
          const portData = await api.getPortfolio();
          setWallet(portData.cash_balance);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to trade.");
      return;
    }
    setLoading(true);
    try {
      await api.placeOrder(selectedSymbol, side, Number(quantity));
      toast.success(`Order placed successfully: ${side} ${quantity} ${selectedSymbol}`);
      // Refresh wallet
      const portData = await api.getPortfolio();
      setWallet(portData.cash_balance);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol);
  const currentPrice = selectedStock ? (prices[selectedSymbol]?.price || selectedStock.current_price) : 0;
  const estimatedTotal = currentPrice * quantity;

  return (
    <div className="trade-page" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
      <h2>Trade</h2>
      {user ? <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Available Cash: ${wallet.toFixed(2)}</p> : null}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Stock Symbol</label>
          <select 
            value={selectedSymbol} 
            onChange={e => setSelectedSymbol(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border-color)' }}
          >
            {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Side</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: side === 'BUY' ? 'var(--accent-hover)' : 'var(--bg-tertiary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="radio" value="BUY" checked={side === 'BUY'} onChange={() => setSide('BUY')} style={{ display: 'none' }} /> BUY
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: side === 'SELL' ? 'var(--danger-color)' : 'var(--bg-tertiary)', borderRadius: '6px', cursor: 'pointer' }}>
              <input type="radio" value="SELL" checked={side === 'SELL'} onChange={() => setSide('SELL')} style={{ display: 'none' }} /> SELL
            </label>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Quantity</label>
          <input 
            type="number" 
            min="1" 
            value={quantity} 
            onChange={e => setQuantity(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border-color)' }}
          />
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Current Price:</span>
            <span>${Number(currentPrice).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Estimated Total:</span>
            <span>${Number(estimatedTotal).toFixed(2)}</span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !user}
          style={{ padding: '1rem', borderRadius: '6px', border: 'none', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 'bold', cursor: loading || !user ? 'not-allowed' : 'pointer', opacity: loading || !user ? 0.7 : 1 }}
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
