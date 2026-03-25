import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTickerList } from './hooks/useTickerList';
import { TickerTable } from './components/TickerTable';
import { EmptyState } from './components/EmptyState';
import { Footer } from './components/Footer';
import { HelpDialog } from './components/HelpDialog';

const queryClient = new QueryClient();

function AppContent() {
  const [tickers, addTicker] = useTickerList();
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = () => setHelpOpen(true);

  return (
    <>
      <main className="gs-app">
        {tickers.length > 0 ? (
          <TickerTable onHelpOpen={openHelp} />
        ) : (
          <EmptyState onAddTicker={addTicker} onHelpOpen={openHelp} />
        )}
      </main>
      <Footer/>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
