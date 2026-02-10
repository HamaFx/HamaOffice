import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import './styles/app-shell.css';
import './styles/dashboard.css';
import './styles/virtual-office.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
