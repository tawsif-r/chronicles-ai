import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, Settings, LogOut, Sparkles, Sun, Moon, X, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agents/new', icon: Bot, label: 'New Agent' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/profile', icon: User, label: 'Profile' },
];
export default function Sidebar({ onClose }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const { theme, toggle } = useTheme();
    function handleLogout() {
        logout();
        navigate('/login');
    }
    return (_jsxs("aside", { className: "w-[220px] shrink-0 flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-white/[0.06]", children: [_jsxs("div", { className: "px-5 h-16 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] shrink-0", children: [_jsxs(NavLink, { to: "/dashboard", className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/30", children: _jsx(Sparkles, { size: 14, className: "text-white" }) }), _jsx("span", { className: "text-sm font-semibold tracking-tight text-gray-900 dark:text-white", children: "ChroniclesAI" })] }), onClose && (_jsx("button", { onClick: onClose, className: "lg:hidden p-1 rounded-md text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300", children: _jsx(X, { size: 16 }) }))] }), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-0.5", children: navItems.map(({ to, icon: Icon, label }) => (_jsxs(NavLink, { to: to, onClick: onClose, className: ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 border ${isActive
                        ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300 border-violet-500/20'
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] border-transparent'}`, children: [_jsx(Icon, { size: 16 }), label] }, to))) }), _jsxs("div", { className: "p-3 border-t border-gray-200 dark:border-white/[0.06] space-y-0.5", children: [user && (_jsx("div", { className: "px-3 py-2 text-xs text-gray-600 dark:text-zinc-500 truncate", children: user.email })), _jsxs("button", { onClick: toggle, className: "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors duration-100", children: [theme === 'dark' ? _jsx(Sun, { size: 16 }) : _jsx(Moon, { size: 16 }), theme === 'dark' ? 'Light mode' : 'Dark mode'] }), _jsxs("button", { onClick: handleLogout, className: "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors duration-100", children: [_jsx(LogOut, { size: 16 }), "Sign out"] })] })] }));
}
