import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function History() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchHistory = async () => {
      try {
        const [ordersData, stocksData] = await Promise.all([
          api.getOrders(),
          api.getStocks()
        ]);
        setOrders(ordersData);
        
        const stockMap = {};
        stocksData.forEach(s => { stockMap[s.id] = s.symbol; });
        setStocks(stockMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  if (!user) return <div className="page-placeholder">Please login to view history</div>;
  if (loading) return <div className="page-placeholder">Loading...</div>;

  return (
    <div className="history">
      <h2>Order History</h2>
      {orders.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No orders found.</p>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map(order => (
            <div key={order.id} style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              padding: '1.5rem', 
              borderRadius: '12px',
              borderLeft: `4px solid ${order.side === 'BUY' ? 'var(--accent-color)' : 'var(--danger-color)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.side} {stocks[order.stock_id]}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)' }}>
                <span>Status: <span style={{ color: order.status === 'FILLED' ? 'var(--success-color)' : 'var(--danger-color)' }}>{order.status}</span></span>
                <span>Quantity: {order.quantity}</span>
                <span>Price: ${Number(order.price_at_execution).toFixed(2)}</span>
                <span>Total: ${Number(order.total_value).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
