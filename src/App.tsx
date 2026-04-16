import { useState, useCallback } from 'react';
import { useTickerList } from './hooks/useTickerList';
import { LiveModeContext } from './hooks/useLiveMode';
import { getLiveMode, setLiveMode as persistLiveMode } from './services/localStorageService';
import { TickerTable } from './components/TickerTable';
import { EmptyState } from './components/EmptyState';
import { Footer } from './components/Footer';
import { HelpDialog } from './components/HelpDialog';
import { usePingServerStatus } from './hooks/usePingServerStatus';
import { ServerStatusContext } from './hooks/useServerStatus';

function AppContent() {
  const [tickers, addTicker] = useTickerList();
  const [helpOpen, setHelpOpen] = useState(false);
  const [isLive, setIsLiveState] = useState(getLiveMode);
  const openHelp = () => setHelpOpen(true);

  const setIsLive = useCallback((live: boolean) => {
    setIsLiveState(live);
    persistLiveMode(live);
  }, []);

  const { connectedStatus, isLoading, isError } = usePingServerStatus();

  return (
    <ServerStatusContext.Provider value={{ connectedStatus, isLoading, isError }}>
      <LiveModeContext.Provider value={{ isLive, setIsLive }}>
        <div className="gs-layout">
          <main className="gs-app">
            {tickers.length > 0 ? (
              <TickerTable onHelpOpen={openHelp} />
            ) : (
              <EmptyState onAddTicker={addTicker} onHelpOpen={openHelp} />
            )}
          </main>
          <Footer />
          <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
      </LiveModeContext.Provider>
    </ServerStatusContext.Provider>
  );
}

function App() {
  return (
    <AppContent />
  );
}

export default App;
