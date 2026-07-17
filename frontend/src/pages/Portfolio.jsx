import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import StockChart from '../components/StockChart';

export default function Portfolio() {
  const { user } = useAuth();
  const { prices } = useMarket();
  const [portfolio, setPortfolio] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHolding, setSelectedHolding] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchPortfolio = async () => {
      try {
        const [portData, equityData] = await Promise.all([
          api.getPortfolio(),
          api.getEquityCurve()
        ]);
        setPortfolio(portData);
        setEquityCurve(equityData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [user]);

  if (!user) return <div className="page-placeholder">Please login to view portfolio</div>;
  if (loading || !portfolio) return <div className="page-placeholder">Loading...</div>;

  // Live Portfolio Graph Updater
  useEffect(() => {
    if (!portfolio || equityCurve.length === 0) return;
    
    const liveTotal = portfolio.holdings.reduce((sum, h) => {
      const livePrice = prices[h.symbol]?.price || (h.current_value / h.quantity);
      return sum + (h.quantity * livePrice);
    }, portfolio.cash_balance);

    setEquityCurve(prevCurve => {
      const updatedCurve = [...prevCurve];
      const lastPoint = updatedCurve[updatedCurve.length - 1];
      const now = new Date();
      const lastTime = new Date(lastPoint.x).getTime();
      
      if (now.getTime() - lastTime >= 10000) {
        updatedCurve.push({ x: now.toISOString(), y: liveTotal });
      } else {
        lastPoint.y = liveTotal;
        lastPoint.x = now.toISOString();
      }
      return updatedCurve;
    });
  }, [prices]); 

  const currentTotal = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].y : 0;

  const equityOptions = {
    chart: { type: 'area', height: 250, background: 'transparent', toolbar: { show: false } },
    title: { text: `$${currentTotal.toFixed(2)}`, style: { color: 'var(--text-primary)', fontSize: '20px' } },
    subtitle: { text: 'Live Total Account Value', style: { color: 'var(--text-secondary)' } },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] }
    },
    xaxis: { type: 'datetime', labels: { style: { colors: 'var(--text-secondary)' } } },
    yaxis: { labels: { style: { colors: 'var(--text-secondary)' }, formatter: v => `$${v.toFixed(2)}` } },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    tooltip: { x: { format: 'dd MMM HH:mm:ss' } }
  };

  const equitySeries = [{ name: 'Total Account Value', data: equityCurve }];

  return (
    <div className="portfolio">
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Cash Balance</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>${portfolio.cash_balance.toFixed(2)}</p>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Portfolio Value</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            ${portfolio.holdings.reduce((sum, h) => sum + (h.quantity * (prices[h.symbol]?.price || h.current_value / h.quantity)), portfolio.cash_balance).toFixed(2)}
          </p>
        </div>
      </div>

      {/* EQUITY CURVE */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '3rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Total Investment (Equity Curve)</h3>
        <Chart options={equityOptions} series={equitySeries} type="area" height={250} />
      </div>

      <h2>Your Holdings</h2>
      {portfolio.holdings.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No stocks in your portfolio yet.</p>
      ) : (
        <div style={{ marginTop: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem' }}>Symbol</th>
                <th style={{ padding: '1rem' }}>Quantity</th>
                <th style={{ padding: '1rem' }}>Avg Cost</th>
                <th style={{ padding: '1rem' }}>Current Price</th>
                <th style={{ padding: '1rem' }}>Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map(h => {
                const livePrice = prices[h.symbol]?.price || (h.current_value / h.quantity);
                const pl = (livePrice - h.avg_cost_basis) * h.quantity;
                const plClass = pl >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                const isSelected = selectedHolding === h.symbol;
                return (
                  <tr 
                    key={h.symbol} 
                    onClick={() => setSelectedHolding(h.symbol)}
                    className="watchlist-row"
                    style={{ 
                      borderTop: '1px solid var(--border-color)', 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>{h.symbol}</td>
                    <td style={{ padding: '1rem' }}>{h.quantity}</td>
                    <td style={{ padding: '1rem' }}>${h.avg_cost_basis.toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>${livePrice.toFixed(2)}</td>
                    <td style={{ padding: '1rem', color: plClass, fontWeight: 'bold' }}>
                      {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* STOCK ACTION GRAPH */}
      {selectedHolding && (
        <div style={{ marginTop: '2rem' }}>
          <StockChart symbol={selectedHolding} livePrice={prices[selectedHolding]?.price} />
        </div>
      )}
    </div>
  );
}
