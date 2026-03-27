'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, createContext, useContext, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me/')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login/', { username, password });
      const { token, user: userData } = res.data;
      
      localStorage.setItem('token', token);
      // تحديث الحالة فوراً عشان AppShell يشوفها
      setUser(userData);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout/'); } catch {}
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div className="loading-spinner" style={{ minHeight: '100vh' }} />;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { 
      queries: { 
        retry: 1, 
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes cache by default
      } 
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
