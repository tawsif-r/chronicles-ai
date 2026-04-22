import { User, LogOut, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoutModal from '../components/LogoutModal';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copiedField, setCopiedField] = useState<'id' | 'email' | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const copyToClipboard = (text: string, field: 'id' | 'email') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-zinc-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1">Profile</h1>
      <p className="text-sm text-gray-500 dark:text-zinc-500 mb-8">Your account information.</p>

      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <User size={16} className="text-gray-400 dark:text-zinc-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Account</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">Email</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white font-mono flex-1">
                  {user.email}
                </span>
                <button
                  onClick={() => copyToClipboard(user.email, 'email')}
                  className="p-2.5 rounded-lg text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
                >
                  {copiedField === 'email' ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">User ID</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-700 dark:text-zinc-400 font-mono flex-1 truncate">
                  {user.id}
                </span>
                <button
                  onClick={() => copyToClipboard(user.id, 'id')}
                  className="p-2.5 rounded-lg text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
                >
                  {copiedField === 'id' ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
}
