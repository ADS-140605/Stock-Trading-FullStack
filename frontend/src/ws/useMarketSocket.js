import { useState, useEffect, useRef } from 'react';

export const useMarketSocket = (username) => {
  const [prices, setPrices] = useState({});
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const timeoutRef = useRef(null);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('token') || 'anonymous';
    const baseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws/market';
    const ws = new WebSocket(`${baseUrl}?token=${token}`);

    ws.onopen = () => timeoutRef.current && clearTimeout(timeoutRef.current);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'price_update') {
        const updates = msg.data.reduce((acc, curr) => ({ ...acc, [curr.symbol]: curr }), {});
        setPrices(p => ({ ...p, ...updates }));
      } else if (msg.type === 'order_filled') {
        setNotifications(n => [msg.data, ...n].slice(0, 5));
      }
    };

    ws.onclose = () => {
      timeoutRef.current = setTimeout(connect, 3000); // auto-reconnect
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, [username]);

  return { prices, notifications };
};
