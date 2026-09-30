import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeAppTheme } from './services/themeService';

// Áp dụng theme trước khi render để tránh chớp nền sáng khi đang dùng dark mode.
initializeAppTheme();

// Khóa chống phóng to (pinch-to-zoom) trên thiết bị di động iOS Safari
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
