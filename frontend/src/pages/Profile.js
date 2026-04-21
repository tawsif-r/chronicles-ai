import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { User, LogOut, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [copiedField, setCopiedField] = useState(null);
    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    if (!user) {
        return (_jsx("div", { className: "p-6 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-screen", children: _jsx("p", { className: "text-gray-500 dark:text-zinc-500", children: "Loading profile..." }) }));
    }
    return (_jsxs("div", { className: "p-6 lg:p-8 max-w-2xl mx-auto", children: [_jsx("h1", { className: "text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1", children: "Profile" }), _jsx("p", { className: "text-sm text-gray-500 dark:text-zinc-500 mb-8", children: "Your account information." }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-6", children: [_jsx(User, { size: 16, className: "text-gray-400 dark:text-zinc-500" }), _jsx("h2", { className: "text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider", children: "Account" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-2", children: "Email" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "px-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white font-mono flex-1", children: user.email }), _jsx("button", { onClick: () => copyToClipboard(user.email, 'email'), className: "p-2.5 rounded-lg text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all", children: copiedField === 'email' ? (_jsx(CheckCircle2, { size: 16, className: "text-green-500" })) : (_jsx(Copy, { size: 16 })) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-2", children: "User ID" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "px-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-700 dark:text-zinc-400 font-mono flex-1 truncate", children: user.id }), _jsx("button", { onClick: () => copyToClipboard(user.id, 'id'), className: "p-2.5 rounded-lg text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all", children: copiedField === 'id' ? (_jsx(CheckCircle2, { size: 16, className: "text-green-500" })) : (_jsx(Copy, { size: 16 })) })] })] })] })] }), _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors", children: [_jsx(LogOut, { size: 14 }), " Sign Out"] })] })] }));
}
