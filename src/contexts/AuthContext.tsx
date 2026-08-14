import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { connectRealtime, disconnectRealtime, apiFetch } from '../mockApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectRealtime();
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    connectRealtime(newToken);
  };

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        // Pre-flight client-side expiration check
        const tokenParts = storedToken.split('.');
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload && payload.exp && payload.exp * 1000 < Date.now()) {
              console.warn("JWT token expired on load, logging out");
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              return;
            }
          } catch (e) {
            console.error("Failed to parse JWT payload", e);
          }
        }

        setToken(storedToken);
        setUser(parsedUser);
        connectRealtime(storedToken);

        // Verify token with backend
        apiFetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        }).then(res => {
          if (res.status === 401 || res.status === 403) {
            console.warn("Token rejected by backend on load, logging out");
            logout();
          }
        }).catch(() => {
          // ignore network errors
        });
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
