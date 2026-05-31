import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { queryClient } from '@/lib/query-client';
import { enableMockServiceWorker } from '@/lib/msw';
import App from '@/App';

import './index.css';

async function bootstrap() {
  // Mock backend in development until Phase 1.1–1.6 backend lands.
  // No-op in production builds.
  await enableMockServiceWorker();

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element #root not found');

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrap();
