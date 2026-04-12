import React from 'react';
import ReactDOM from 'react-dom/client';
import { TerminalProvider } from './contexts/TerminalContext';
import { CartProvider } from './contexts/CartContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TerminalProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </TerminalProvider>
  </React.StrictMode>,
);
