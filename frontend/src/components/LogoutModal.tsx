import { LogOut, X } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-2xl w-full max-w-sm p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-md text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
          <LogOut size={18} className="text-red-600 dark:text-red-400" />
        </div>

        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Sign out?</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
          You'll need to sign in again to access your agents and workspace.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
