import { createContext, useContext } from 'react';

export interface LiveModeContextValue {
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

export const LiveModeContext = createContext<LiveModeContextValue>({
  isLive: true,
  setIsLive: () => {},
});

export function useLiveMode(): LiveModeContextValue {
  return useContext(LiveModeContext);
}
