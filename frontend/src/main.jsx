import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './assets/styles/global.css';
import './i18n';
import { purgeLegacyReadingHistory } from './utils/historyStorage';

purgeLegacyReadingHistory();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
