import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTickerList } from './hooks/useTickerList';
import { TickerTable } from './components/TickerTable';
import { EmptyState } from './components/EmptyState';

const queryClient = new QueryClient();

function AppContent() {
  const [tickers, addTicker] = useTickerList();

  return (
    <main>
      {tickers.length > 0 ? <TickerTable /> : <EmptyState onAddTicker={addTicker} />}
    </main>
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
