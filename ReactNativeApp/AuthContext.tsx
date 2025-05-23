import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

interface AuthContextType {
  user: any;
  login: (user: any) => void;
  logout: () => void;
  loading: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false); // No async restore

  // On mount, check session with backend
  useEffect(() => {
    async function checkSession() {
      setLoading(true);
      const API_BASE = Platform.OS === 'web' ? 'https://localhost:4000' : '';
      try {
        const res = await fetch(`${API_BASE}/api/session`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  const login = (userObj: any) => {
    setUser(userObj);
  };

  const logout = () => {
    setUser(null);
    const API_BASE = Platform.OS === 'web' ? 'https://localhost:4000' : '';
    fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, token: null }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
