import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cafeteria-user');
    return saved ? JSON.parse(saved) : null;
  });

  // Add axios interceptor to handle token expiration
  React.useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Check if it's a token expiration error
          if (error.response.data?.code === 'TOKEN_EXPIRED') {
            // Show a toast or notification about session expiration
            alert('Your session has expired. Please login again.');
          }
          // Clear user data and redirect
          localStorage.removeItem('cafeteria-user');
          setUser(null);
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = (data) => {
    localStorage.setItem('cafeteria-user', JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('cafeteria-user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
