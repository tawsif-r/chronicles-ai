import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AgentNew from './pages/AgentNew';
import AgentDetail from './pages/AgentDetail';
import AgentChat from './pages/AgentChat';
import AgentLogs from './pages/AgentLogs';
import AgentMemory from './pages/AgentMemory';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
function PrivateRoute({ children }) {
    const { token } = useAuth();
    return token ? _jsx(Layout, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsx(ThemeProvider, { children: _jsx(AuthProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(PrivateRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/agents/new", element: _jsx(PrivateRoute, { children: _jsx(AgentNew, {}) }) }), _jsx(Route, { path: "/agents/:id", element: _jsx(PrivateRoute, { children: _jsx(AgentDetail, {}) }) }), _jsx(Route, { path: "/agents/:id/chat", element: _jsx(PrivateRoute, { children: _jsx(AgentChat, {}) }) }), _jsx(Route, { path: "/agents/:id/logs", element: _jsx(PrivateRoute, { children: _jsx(AgentLogs, {}) }) }), _jsx(Route, { path: "/agents/:id/memory", element: _jsx(PrivateRoute, { children: _jsx(AgentMemory, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(PrivateRoute, { children: _jsx(Settings, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(PrivateRoute, { children: _jsx(Profile, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }) }) }));
}
