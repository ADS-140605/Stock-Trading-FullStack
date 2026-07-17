import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { api } from '../api/client';
import { aggregateToCandles, calculateSMA } from '../utils/chartHelpers';

export default function StockChart({ symbol, livePrice }) {
  const [series, setSeries] = useState([]);
  const [period, setPeriod] = useState('live'); // live, 1d, 1mo, 1y, 5y, max
  const [candles, setCandles] = useState([]);

  // 1. Fetch historical data on mount or when symbol/period changes
  useEffect(() => {
    const loadData = async () => {
      try {
        let newCandles = [];
        if (period === 'live') {
          // LIVE uses the 1000 raw price ticks from the local simulation database
          const history = await api.getStockHistory(symbol, 0, 1000);
          newCandles = aggregateToCandles(history, 10);
        } else {
          // 1D, 1M, 1Y, 5Y, MAX use real Yahoo Finance data
          newCandles = await api.getStockChart(symbol, period);
        }
        setCandles(newCandles);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [symbol, period]);

  // 2. Append live ticks to the LIVE chart without re-fetching
  useEffect(() => {
    if (period !== 'live' || !livePrice || candles.length === 0) return;

    setCandles(prevCandles => {
      const updatedCandles = [...prevCandles];
      const lastCandle = updatedCandles[updatedCandles.length - 1];
      const now = new Date();
      
      const lastCandleTime = new Date(lastCandle.x).getTime();
      
      // Roll over to a new candle every 10 seconds for the LIVE chart
      if (now.getTime() - lastCandleTime >= 10000) {
        updatedCandles.push({
          x: now,
          y: [livePrice, livePrice, livePrice, livePrice] // O, H, L, C
        });
      } else {
        // Update current candle
        lastCandle.y[1] = Math.max(lastCandle.y[1], livePrice); // High
        lastCandle.y[2] = Math.min(lastCandle.y[2], livePrice); // Low
        lastCandle.y[3] = livePrice; // Close
      }
      return updatedCandles;
    });
  }, [livePrice, period]);

  // 3. Render chart series whenever candles change
  useEffect(() => {
    const sma = calculateSMA(candles, 5);
    setSeries([
      { name: 'Candlestick', type: 'candlestick', data: candles },
      { name: 'SMA (5)', type: 'line', data: sma }
    ]);
  }, [candles]);

  const options = {
    chart: {
      type: 'candlestick',
      height: 350,
      background: 'transparent',
      animations: { enabled: false },
      toolbar: { show: false }
    },
    theme: { mode: 'dark' },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: 'var(--text-secondary)' } }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { style: { colors: 'var(--text-secondary)' }, formatter: (v) => v ? v.toFixed(2) : '' }
    },
    stroke: {
      width: [1, 2],
      curve: 'smooth'
    },
    colors: ['#00E396', '#FEB019'],
    plotOptions: {
      candlestick: {
        colors: { upward: '#00E396', downward: '#FF4560' }
      }
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{symbol} {period.toUpperCase()} Chart</h3>
        </div>

        {/* Timeframe Toggles */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['live', '1d', '1mo', '1y', '5y', 'max'].map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)}
              style={{ 
                padding: '0.25rem 0.5rem', 
                backgroundColor: period === p ? 'var(--accent-color)' : 'transparent',
                border: '1px solid var(--border-color)',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}
            >
              {p.toUpperCase().replace('MO', 'M')}
            </button>
          ))}
        </div>
      </div>
      <Chart options={options} series={series} type="line" height={350} />
    </div>
  );
}
