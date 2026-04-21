import axios from 'axios';
export const apiClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});
// Attach stored token on startup
const stored = localStorage.getItem('access_token');
if (stored) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
}
// Refresh token on 401
apiClient.interceptors.response.use((res) => res, async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
            try {
                const { data } = await axios.post('/api/auth/refresh', {
                    refreshToken: refresh,
                });
                localStorage.setItem('access_token', data.accessToken);
                localStorage.setItem('refresh_token', data.refreshToken);
                apiClient.defaults.headers.common['Authorization'] =
                    `Bearer ${data.accessToken}`;
                original.headers['Authorization'] = `Bearer ${data.accessToken}`;
                return apiClient(original);
            }
            catch {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
    }
    return Promise.reject(err);
});
