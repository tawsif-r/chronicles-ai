import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-24 px-4 text-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/10 dark:bg-violet-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-600/20 text-violet-600 dark:text-violet-400 text-xs font-medium mb-6">
          <Zap size={11} />
          Now with RAG + Agentic Tool Use
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight mb-5">
          Build AI agents that{' '}
          <span className="text-violet-600 dark:text-violet-400">work for you</span>
        </h1>

        <p className="text-lg text-gray-500 dark:text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed">
          Create custom AI agents with any model, connect them to Telegram, Slack, and Discord, give them tools and documents — then let them run on autopilot.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register"
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-violet-900/30">
            Get started free <ArrowRight size={14} />
          </Link>
          <Link to="/login"
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
            <Sparkles size={14} className="text-violet-600 dark:text-violet-400" />
            Sign in to workspace
          </Link>
        </div>

        <p className="mt-5 text-xs text-gray-400 dark:text-zinc-600">Free tier available · No credit card required</p>
      </div>
    </section>
  );
}
