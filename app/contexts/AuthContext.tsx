import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'cafe_pos_token';
const USER_KEY = 'cafe_pos_user';

// Demo user for testing without backend
const DEMO_USER: User = {
  id: '1',
  email: 'demo@cafe.com',
  firstName: 'Demo',
  lastName: 'User',
  fullName: 'Demo User',
  phone: '+90 555 123 4567',
  gender: null,
  isStaff: true,
  imageUrl: null,
  permissions: ['waiter:view', 'orders:change', 'tables:change'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    // Demo login - accepts any credentials
    try {
      console.log(email, password);
      
      const demoToken = 'demo-token-' + Date.now();
      setToken(demoToken);
      setUser(DEMO_USER);
      // localStorage.setItem(TOKEN_KEY, demoToken);
      // localStorage.setItem(USER_KEY, JSON.stringify(DEMO_USER));
      console.log('here');
      return { success: true, message: 'Giriş başarılı.' };
      
    } catch (error) {
      console.log('e',error);
      
      return { success: false, message: "" };
      
    }

  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
