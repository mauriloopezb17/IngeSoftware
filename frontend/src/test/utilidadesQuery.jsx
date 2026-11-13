import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export function crearClientePruebas() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

export function renderConQuery(ui) {
  const cliente = crearClientePruebas();
  return render(<QueryClientProvider client={cliente}>{ui}</QueryClientProvider>);
}
