import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-white/[0.06] py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center shadow-sm">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">ChroniclesAI</span>
          <span className="text-xs text-gray-400 dark:text-zinc-600 ml-2">© 2026</span>
        </div>

        <nav className="flex items-center gap-5">
          <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
          <Link to="/login" className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">Sign in</Link>
          <Link to="/register" className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors">Get started</Link>
        </nav>
      </div>
    </footer>
  );
}
