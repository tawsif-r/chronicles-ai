import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState, } from 'react';
import { apiClient } from '../api/client';
import { queryClient } from '../api/queryClient';
const Ctx = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('access_token'));
    const [user, setUser] = useState(null);
    useEffect(() => {
        if (token) {
            localStorage.setItem('access_token', token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Fetch user profile
            apiClient.get('/auth/me')
                .then((r) => setUser(r.data))
                .catch(() => setUser(null));
        }
        else {
            localStorage.removeItem('access_token');
            delete apiClient.defaults.headers.common['Authorization'];
            setUser(null);
        }
    }, [token]);
    const login = useCallback(async (dto) => {
        const { data } = await apiClient.post('/auth/login', dto);
        localStorage.setItem('refresh_token', data.refreshToken);
        setToken(data.accessToken);
    }, []);
    const register = useCallback(async (dto) => {
        const { data } = await apiClient.post('/auth/register', dto);
        localStorage.setItem('refresh_token', data.refreshToken);
        setToken(data.accessToken);
    }, []);
    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        queryClient.clear();
    }, []);
    return (_jsx(Ctx.Provider, { value: { token, user, login, register, logout }, children: children }));
}
export function useAuth() {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
