import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

// Satu instance QueryClient untuk seluruh aplikasi.
// retry: 1 -> cukup 1x percobaan ulang otomatis (bukan default 3x) karena
// sebagian query di sini berbasis token sekali-pakai; retry agresif pada
// request yang gagal karena token invalid/kadaluarsa hanya membuang waktu.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
