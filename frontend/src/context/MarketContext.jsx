import { createContext, useContext } from 'react';
import { useMarketSocket } from '../ws/useMarketSocket';
import { useAuth } from './AuthContext';

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const { user } = useAuth();
  const { prices, notifications } = useMarketSocket(user?.username);

  return (
    <MarketContext.Provider value={{ prices, notifications }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);
