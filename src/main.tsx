import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, ':', lineno, ':', colno, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = '<div style="color: white; background: #0a0a0a; padding: 20px; font-family: sans-serif;"><h1>Kesalahan Fatal</h1><p>' + message + '</p><button onclick="location.reload()">Muat Ulang</button></div>';
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
