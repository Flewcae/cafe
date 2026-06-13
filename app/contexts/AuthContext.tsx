import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '@/types/api';
import { apolloClient } from '@/graphql/client/apollo';
import { tokenStorage } from '@/graphql/client/storage';
import { LOGIN, LOGOUT } from '@/graphql/mutations';
import { ME } from '@/graphql/queries';
import {
  LoginResult,
  LoginVars,
  LogoutResult,
  MeResult,
} from '@/graphql/generated/operations';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Uygulama açılışında: saklı token varsa `me` ile oturumu geri yükle.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await tokenStorage.get();
        if (!stored) return;
        const { data } = await apolloClient.query<MeResult>({
          query: ME,
          fetchPolicy: 'network-only',
        });
        if (active && data?.me) {
          setToken(stored);
          setUser(data.me);
        } else {
          await tokenStorage.clear();
        }
      } catch {
        // Token geçersiz/ağ yok: sessizce temizle, login ekranına düşsün.
        await tokenStorage.clear();
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, errors } = await apolloClient.mutate<LoginResult, LoginVars>({
        mutation: LOGIN,
        variables: { email, password },
      });

      if (errors?.length) {
        return { success: false, message: errors[0].message };
      }

      const payload = data?.login;
      if (!payload || !payload.success || !payload.token || !payload.user) {
        return {
          success: false,
          message: payload?.message ?? 'Giriş başarısız.',
        };
      }

      await tokenStorage.set(payload.token);
      setToken(payload.token);
      setUser(payload.user);
      return { success: true, message: payload.message };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Bir hata oluştu. Lütfen tekrar deneyin.';
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apolloClient.mutate<LogoutResult>({ mutation: LOGOUT });
    } catch {
      // Token zaten geçersizse backend hata verebilir; istemci tarafını yine de temizle.
    } finally {
      await tokenStorage.clear();
      setToken(null);
      setUser(null);
      // WS bağlantısını da kopararak önbelleği temizle.
      await apolloClient.clearStore().catch(() => undefined);
    }
  }, []);

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
