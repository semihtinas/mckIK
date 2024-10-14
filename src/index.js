import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // React Router kullanımı
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter> {/* Tüm uygulamayı BrowserRouter ile sarıyoruz */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
