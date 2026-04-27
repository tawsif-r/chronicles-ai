import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';
import axios from 'axios';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  maxAgents: number;
  maxChannelsPerAgent: number;
  maxMessagesPerMonth: number;
}

function fmt(n: number) {
  return n === -1 ? 'Unlimited' : n.toLocaleString();
}

const perks: Record<string, string[]> = {
  FREE: ['1 agent', '1 channel per agent', '100 messages / month', 'Anthropic (Claude) only', 'Browser chat'],
  PRO: ['10 agents', '5 channels per agent', '5,000 messages / month', 'All model providers', 'All channels', 'Scheduled agents'],
  MAX: ['Unlimited agents', 'Unlimited channels', 'Unlimited messages', 'All model providers', 'All channels', 'Scheduled agents', 'Priority support'],
};

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    axios.get('/api/billing/plans').then((r) => setPlans(r.data)).catch(() => {});
  }, []);

  const order = ['FREE', 'PRO', 'MAX'];
  const sorted = order.map((n) => plans.find((p) => p.name === n)).filter(Boolean) as Plan[];

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto">Start free. Upgrade when your agents need more room to run.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {(sorted.length ? sorted : order.map((name) => ({ id: name, name, priceMonthly: name === 'FREE' ? 0 : name === 'PRO' ? 19 : 49, maxAgents: name === 'FREE' ? 1 : name === 'PRO' ? 10 : -1, maxChannelsPerAgent: name === 'FREE' ? 1 : name === 'PRO' ? 5 : -1, maxMessagesPerMonth: name === 'FREE' ? 100 : name === 'PRO' ? 5000 : -1 }))).map((plan) => {
            const isPro = plan.name === 'PRO';
            return (
              <div key={plan.id}
                className={`relative rounded-xl border p-6 ${isPro ? 'bg-violet-600 border-violet-500 shadow-xl shadow-violet-900/40' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/[0.08]'}`}>
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-violet-600 text-xs font-semibold shadow-sm">
                      <Zap size={10} /> Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className={`font-bold text-sm uppercase tracking-wider mb-2 ${isPro ? 'text-white/70' : 'text-gray-500 dark:text-zinc-500'}`}>{plan.name}</h3>
                  <div className={`text-4xl font-bold ${isPro ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    ${plan.priceMonthly}
                    <span className={`text-sm font-normal ml-1 ${isPro ? 'text-white/60' : 'text-gray-400 dark:text-zinc-500'}`}>/mo</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {(perks[plan.name] ?? [`${fmt(plan.maxAgents)} agents`, `${fmt(plan.maxChannelsPerAgent)} channels/agent`, `${fmt(plan.maxMessagesPerMonth)} messages/mo`]).map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm">
                      <Check size={13} className={isPro ? 'text-white/80' : 'text-violet-600 dark:text-violet-400'} />
                      <span className={isPro ? 'text-white/90' : 'text-gray-600 dark:text-zinc-400'}>{perk}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register"
                  className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${isPro ? 'bg-white text-violet-600 hover:bg-violet-50' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'}`}>
                  {plan.name === 'FREE' ? 'Get started free' : `Start ${plan.name}`}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
