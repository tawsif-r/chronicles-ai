import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden", children: [sidebarOpen && (_jsx("div", { className: "fixed inset-0 z-40 bg-black/50 lg:hidden", onClick: () => setSidebarOpen(false) })), _jsx("div", { className: `
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:flex
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `, children: _jsx(Sidebar, { onClose: () => setSidebarOpen(false) }) }), _jsxs("div", { className: "flex flex-col flex-1 min-w-0 overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-white/[0.06] lg:hidden bg-white dark:bg-zinc-950 shrink-0", children: [_jsx("button", { onClick: () => setSidebarOpen(true), className: "p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors", children: _jsx(Menu, { size: 18 }) }), _jsx(Link, { to: "/dashboard", className: "text-sm font-semibold text-gray-900 dark:text-white", children: "ChroniclesAI" })] }), _jsx("main", { className: "flex-1 overflow-auto min-w-0", children: children })] })] }));
}
