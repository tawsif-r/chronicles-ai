import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({ email, password });
            navigate('/dashboard');
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'Registration failed. Try again.');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center px-4", children: [_jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: _jsx("div", { className: "absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" }) }), _jsxs("div", { className: "relative w-full max-w-sm", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600 shadow-lg shadow-violet-900/30 mb-4", children: _jsx(Sparkles, { size: 18, className: "text-white" }) }), _jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "Create account" }), _jsx("p", { className: "text-sm text-gray-500 dark:text-zinc-500 mt-1", children: "Get started with ChroniclesAI" })] }), _jsx("div", { className: "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [error && (_jsx("div", { className: "px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400", children: error })), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", required: true, className: "w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50 focus:ring-1 focus:ring-violet-400/20 dark:focus:ring-violet-500/20 transition-all" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPass ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Min. 8 characters", minLength: 8, required: true, className: "w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50 focus:ring-1 focus:ring-violet-400/20 dark:focus:ring-violet-500/20 transition-all" }), _jsx("button", { type: "button", onClick: () => setShowPass(!showPass), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors", children: showPass ? _jsx(EyeOff, { size: 14 }) : _jsx(Eye, { size: 14 }) })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-violet-900/30", children: loading ? _jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }) : _jsxs(_Fragment, { children: ["Create account ", _jsx(ArrowRight, { size: 14 })] }) })] }) }), _jsxs("p", { className: "text-center text-sm text-gray-400 dark:text-zinc-600 mt-6", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors", children: "Sign in" })] })] })] }));
}
