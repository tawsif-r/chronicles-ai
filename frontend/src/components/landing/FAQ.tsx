import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const items = [
  {
    q: 'What is ChroniclesAI?',
    a: 'ChroniclesAI is a platform for creating and deploying custom AI agents. You define their personality, connect them to your messaging channels, give them tools and documents, and they run — manually or on a schedule.',
  },
  {
    q: 'Which AI model providers are supported?',
    a: 'Claude (Anthropic), OpenAI, Ollama (local models), and OpenRouter are all supported. Each workspace stores its own encrypted API keys — nothing shared.',
  },
  {
    q: 'Can I connect my Telegram or Slack bot?',
    a: 'Yes. ChroniclesAI auto-registers webhooks for Telegram, Slack, Discord, and WhatsApp. Add the bot token in the agent channel settings and it\'s live.',
  },
  {
    q: 'What can agents actually do with tools?',
    a: 'Agents can make outbound HTTP requests, read and write their own memory, and perform semantic search over uploaded documents. The agentic loop runs up to 5 rounds per message.',
  },
  {
    q: 'How does billing work?',
    a: 'Billing is per workspace. The FREE tier lets you explore with 1 agent and 100 messages per month. PRO unlocks 10 agents and 5,000 messages for $19/mo. MAX removes all limits for $49/mo.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Yes — the FREE plan requires no credit card. It includes 1 agent, 1 channel connection, and 100 messages per month. Upgrade anytime.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4 bg-gray-50/50 dark:bg-zinc-900/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Frequently asked questions</h2>
          <p className="text-gray-500 dark:text-zinc-400">Still have questions? Email us at <a href="mailto:hello@chroniclesai.com" className="text-violet-600 dark:text-violet-400 hover:underline">hello@chroniclesai.com</a></p>
        </div>

        <div className="space-y-2">
          {items.map(({ q, a }, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{q}</span>
                <ChevronDown size={15} className={`text-gray-400 dark:text-zinc-500 transition-transform flex-shrink-0 ml-4 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
