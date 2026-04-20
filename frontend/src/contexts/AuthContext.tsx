import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiClient } from '../api/client';
import { queryClient } from '../api/queryClient';
import type { AuthTokens, LoginDto, RegisterDto } from '@chronicles/shared';

interface AuthCtx {
  token: string | null;
  user: { id: string; email: string; workspaceId: string } | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('access_token'),
  );
  const [user, setUser] = useState<{ id: string; email: string; workspaceId: string } | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user profile
      apiClient.get<{ id: string; email: string; workspaceId: string }>('/auth/me')
        .then((r) => setUser(r.data))
        .catch(() => setUser(null));
    } else {
      localStorage.removeItem('access_token');
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  const login = useCallback(async (dto: LoginDto) => {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', dto);
    localStorage.setItem('refresh_token', data.refreshToken);
    setToken(data.accessToken);
  }, []);

  const register = useCallback(async (dto: RegisterDto) => {
    const { data } = await apiClient.post<AuthTokens>('/auth/register', dto);
    localStorage.setItem('refresh_token', data.refreshToken);
    setToken(data.accessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    queryClient.clear();
  }, []);

  return (
    <Ctx.Provider value={{ token, user, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
