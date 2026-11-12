import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { router } from './router.jsx';
import { queryClient } from './services/queryClient.js';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
