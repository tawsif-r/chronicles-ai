import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Menu, X } from 'lucide-react';

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">ChroniclesAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollTo('features')} className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">Features</button>
          <button onClick={() => scrollTo('how-it-works')} className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">How it works</button>
          <button onClick={() => scrollTo('pricing')} className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</button>
          <button onClick={() => scrollTo('faq')} className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</button>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/login" className="px-3 py-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04]">
            Sign in
          </Link>
          <Link to="/register" className="px-3 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors shadow-lg shadow-violet-900/30">
            Get started free
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-zinc-950 px-4 py-4 space-y-1">
          {['features', 'how-it-works', 'pricing', 'faq'].map((id) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="block w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors capitalize">
              {id.replace('-', ' ')}
            </button>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-center text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
              Sign in
            </Link>
            <Link to="/register" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-center font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
