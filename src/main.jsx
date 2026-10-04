import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { migrateStorage } from './utils/migrateStorage';

migrateStorage();
createRoot(document.getElementById('root')).render(<StrictMode>
    <App />
  </StrictMode>);
