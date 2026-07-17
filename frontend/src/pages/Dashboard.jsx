import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StockChart from '../components/StockChart';

export default function Dashboard() {
  const { prices } = useMarket();
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });

  // Portfolio State
  const [portfolio, setPortfolio] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stocksData = await api.getStocks();
        setStocks(stocksData);

        if (user) {
          const [portData, equityData] = await Promise.all([
            api.getPortfolio(),
            api.getEquityCurve()
          ]);
          setPortfolio(portData);
          setEquityCurve(equityData);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedStocks = () => {
    const sortableStocks = [...stocks].map(stock => {
      const liveData = prices[stock.symbol] || stock;
      return {
        ...stock,
        livePrice: Number(liveData.current_price || liveData.price || 0),
        liveChange: Number(liveData.change_pct || 0)
      };
    });

    sortableStocks.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'livePrice') {
        aValue = a.livePrice;
        bValue = b.livePrice;
      } else if (sortConfig.key === 'liveChange') {
        aValue = a.liveChange;
        bValue = b.liveChange;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortableStocks;
  };

  if (loading) return <div className="page-placeholder">Loading market data...</div>;

  const sortedStocks = getSortedStocks();

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return sortConfig.direction === 'asc' ? <span style={{ color: 'var(--accent-color)', marginLeft: '4px' }}>↑</span> : <span style={{ color: 'var(--accent-color)', marginLeft: '4px' }}>↓</span>;
  };

  // Pie Chart Data
  let pieSeries = [];
  let pieLabels = [];
  if (portfolio) {
    pieSeries.push(portfolio.cash_balance);
    pieLabels.push('Cash');
    portfolio.holdings.forEach(h => {
      const livePrice = prices[h.symbol]?.price || (h.current_value / h.quantity);
      pieSeries.push(h.quantity * livePrice);
      pieLabels.push(h.symbol);
    });
  }

  const pieOptions = {
    chart: { type: 'donut', background: 'transparent' },
    theme: { mode: 'dark' },
    labels: pieLabels,
    stroke: { show: false },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };

  // Live Portfolio Graph Updater
  useEffect(() => {
    if (!portfolio || equityCurve.length === 0) return;
    
    // Calculate live total value
    const liveTotal = portfolio.holdings.reduce((sum, h) => {
      const livePrice = prices[h.symbol]?.price || (h.current_value / h.quantity);
      return sum + (h.quantity * livePrice);
    }, portfolio.cash_balance);

    setEquityCurve(prevCurve => {
      const updatedCurve = [...prevCurve];
      const lastPoint = updatedCurve[updatedCurve.length - 1];
      const now = new Date();
      
      const lastTime = new Date(lastPoint.x).getTime();
      // Add a new point every 10 seconds to create a live-moving line graph
      if (now.getTime() - lastTime >= 10000) {
        updatedCurve.push({ x: now.toISOString(), y: liveTotal });
      } else {
        lastPoint.y = liveTotal;
        lastPoint.x = now.toISOString();
      }
      return updatedCurve;
    });
  }, [prices]); // Run when prices stream updates

  const currentTotal = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].y : 0;

  const equityOptions = {
    chart: { type: 'area', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
    title: { text: `$${currentTotal.toFixed(2)}`, style: { color: 'var(--text-primary)', fontSize: '20px' } },
    subtitle: { text: 'Live Portfolio Value', style: { color: 'var(--text-secondary)' } },
    theme: { mode: 'dark' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    xaxis: { type: 'datetime', labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: 'var(--text-secondary)' }, formatter: v => `$${v.toFixed(0)}` } },
    colors: ['#10b981'],
    dataLabels: { enabled: false },
    tooltip: { x: { format: 'dd MMM HH:mm:ss' } }
  };

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* TOP SECTION: LIVE MARKET (Watchlist + Chart) */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* WATCHLIST SIDEBAR */}
        <div className="watchlist-container" style={{ flex: '1 1 40%', maxWidth: '500px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Live Market Watch</h3>
          </div>
          <div style={{ display: 'flex', padding: '1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
            <div style={{ flex: 2, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('symbol')}>
              Instrument {renderSortArrow('symbol')}
            </div>
            <div style={{ flex: 1, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('livePrice')}>
              Price {renderSortArrow('livePrice')}
            </div>
            <div style={{ flex: 1, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('liveChange')}>
              Change {renderSortArrow('liveChange')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto' }}>
            {sortedStocks.map(stock => {
              const isPositive = stock.liveChange >= 0;
              const isSelected = selectedChart === stock.symbol;
              return (
                <div 
                  key={stock.symbol} 
                  className="watchlist-row"
                  onClick={() => setSelectedChart(stock.symbol)}
                  style={{ 
                    display: 'flex', padding: '1rem', borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                    cursor: 'pointer', transition: 'background-color 0.2s ease', alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>{stock.symbol}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stock.name}</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontWeight: '500', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                    {stock.livePrice.toFixed(2)}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: isPositive ? 'var(--success-color)' : 'var(--danger-color)' }}>
                    {isPositive ? '+' : ''}{stock.liveChange.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART VIEW */}
        <div className="chart-container" style={{ flex: '1 1 60%' }}>
          <StockChart symbol={selectedChart || '^NSEI'} livePrice={prices[selectedChart || '^NSEI']?.price} />
        </div>
      </div>

      {/* BOTTOM SECTION: PORTFOLIO OVERVIEW */}
      {user && portfolio && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '1rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>My Portfolio Overview</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Pie Chart Widget */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1rem' }}>Asset Allocation</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Chart options={pieOptions} series={pieSeries} type="donut" height={250} />
              </div>
            </div>

            {/* P&L Line Graph Widget */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <Chart options={equityOptions} series={[{ name: 'Total Value', data: equityCurve }]} type="area" height={270} />
            </div>

            {/* Holdings List Widget */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', overflowY: 'auto', maxHeight: '330px' }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1rem' }}>Quick Holdings (Click to Plot)</h3>
              {portfolio.holdings.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No stocks owned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {portfolio.holdings.map(h => {
                    const livePrice = prices[h.symbol]?.price || (h.current_value / h.quantity);
                    const pl = (livePrice - h.avg_cost_basis) * h.quantity;
                    const plClass = pl >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                    const isSelected = selectedChart === h.symbol;
                    return (
                      <div 
                        key={h.symbol} 
                        onClick={() => {
                           setSelectedChart(h.symbol);
                           window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top chart
                        }}
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '0.5rem', borderBottom: '1px solid var(--border-color)', 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                          borderRadius: '4px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>{h.symbol}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qty: {h.quantity}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'monospace' }}>${(h.quantity * livePrice).toFixed(2)}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: plClass }}>
                            {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
