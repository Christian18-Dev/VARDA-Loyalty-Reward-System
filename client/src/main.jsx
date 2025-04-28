import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';  // Make sure this path is correct
import './index.css'
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>  {/* Wrap your App component with AuthProvider */}
    <App />
  </AuthProvider>
);
