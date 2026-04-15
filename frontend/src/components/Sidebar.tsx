import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, Settings, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents/new', icon: Bot, label: 'New Agent' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen bg-zinc-950 border-r border-white/[0.06]">
      {/* Brand */}
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">ChroniclesAI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
