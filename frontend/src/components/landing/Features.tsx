import { Bot, Wrench, FileText, MessageSquare, Clock, CreditCard } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'Custom AI Agents',
    description: 'Create agents with any model — Claude, OpenAI, Ollama, or OpenRouter. Define their personality and behavior with a SOUL.md prompt.',
  },
  {
    icon: Wrench,
    title: 'Agentic Tool Use',
    description: 'Agents can make HTTP requests, read and write memory, and search documents — all within a multi-step reasoning loop.',
  },
  {
    icon: FileText,
    title: 'Document RAG',
    description: 'Upload PDFs, Word docs, and text files. Agents embed and semantically search your documents to ground their answers.',
  },
  {
    icon: MessageSquare,
    title: 'Multi-Channel Deployment',
    description: 'Connect agents to Telegram, Slack, Discord, and WhatsApp with automatic webhook registration.',
  },
  {
    icon: Clock,
    title: 'Scheduled Agents',
    description: 'Set cron schedules to trigger agents automatically. They run, use tools, and post results to your channels.',
  },
  {
    icon: CreditCard,
    title: 'Usage-Based Billing',
    description: 'Start free, upgrade when you need to. Per-workspace limits on agents, channels, and messages per month.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Everything you need</h2>
          <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto">One platform to create, deploy, and automate AI agents across every channel you use.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-5 hover:border-violet-500/30 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center mb-3">
                <Icon size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
