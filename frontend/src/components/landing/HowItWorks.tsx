const steps = [
  {
    n: '01',
    title: 'Create your agent',
    description: 'Give it a name, pick a model provider, and write a SOUL.md — the personality and instructions that define how your agent thinks and responds.',
  },
  {
    n: '02',
    title: 'Connect channels & tools',
    description: 'Link Telegram, Slack, or Discord bots. Add documents for RAG. Enable tool use so your agent can browse, remember, and call APIs.',
  },
  {
    n: '03',
    title: 'Let it run autonomously',
    description: 'Set a cron schedule or chat manually. Your agent runs its agentic loop, uses tools, and delivers results to every connected channel.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-gray-50/50 dark:bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Up and running in minutes</h2>
          <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto">No infrastructure to manage. Just create, connect, and automate.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-violet-600/30 to-transparent" />

          {steps.map(({ n, title, description }) => (
            <div key={n} className="relative text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] shadow-sm mb-4">
                <span className="text-lg font-bold text-violet-600 dark:text-violet-400">{n}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-500 leading-relaxed max-w-xs mx-auto">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
