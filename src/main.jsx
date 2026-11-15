/**
 * Programos iejimo taskas: sukuria React saknies elementa, ijungia StrictMode,
 * BrowserRouter marsrutizavima ir Toast pranesimu tiekeja, tada atvaizduoja App.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from '@/components/ui';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
