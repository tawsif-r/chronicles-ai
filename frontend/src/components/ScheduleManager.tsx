import { useState } from 'react';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import cronstrue from 'cronstrue';
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '../hooks/useSchedules';
import type { AgentSchedule, TelegramDispatch } from '@chronicles/shared';

interface Props { agentId: string; }

const DISPATCH_OPTIONS: { value: TelegramDispatch; label: string; description: string }[] = [
  { value: 'owner',        label: 'Owner only',    description: 'Send to the chat ID configured on the channel' },
  { value: 'broadcast',    label: 'Broadcast',     description: 'Send the same reply to everyone who has chatted with this bot' },
  { value: 'personalized', label: 'Personalized',  description: 'Run the prompt in each user\'s conversation context — everyone gets a tailored reply' },
  { value: 'none',         label: 'No Telegram',   description: 'Run the prompt and log the result, but don\'t send to Telegram' },
];

const PRESETS = [
  { label: 'Every 30 min',    cron: '*/30 * * * *' },
  { label: 'Every hour',      cron: '0 * * * *'    },
  { label: 'Every 6 hours',   cron: '0 */6 * * *'  },
  { label: 'Daily 9am',       cron: '0 9 * * *'    },
  { label: 'Daily midnight',  cron: '0 0 * * *'    },
  { label: 'Weekdays 9am',    cron: '0 9 * * 1-5'  },
  { label: 'Mon 9am',         cron: '0 9 * * 1'    },
];

function describeCron(expr: string): { text: string; valid: boolean } {
  try {
    return { text: cronstrue.toString(expr, { verbose: false }), valid: true };
  } catch {
    return { text: 'Invalid expression', valid: false };
  }
}

function formatLastRun(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export default function ScheduleManager({ agentId }: Props) {
  const { data: schedules = [], isLoading } = useSchedules(agentId);
  const create = useCreateSchedule(agentId);
  const update = useUpdateSchedule(agentId);
  const remove = useDeleteSchedule(agentId);

  const [showForm, setShowForm] = useState(false);
  const [cron, setCron] = useState('');
  const [prompt, setPrompt] = useState('');
  const [telegramDispatch, setTelegramDispatch] = useState<TelegramDispatch>('owner');
  const [formError, setFormError] = useState<string | null>(null);

  const cronDesc = cron.trim() ? describeCron(cron.trim()) : null;

  async function handleCreate() {
    setFormError(null);
    if (!cron.trim() || !prompt.trim()) { setFormError('Both fields required'); return; }
    if (cronDesc && !cronDesc.valid) { setFormError('Fix the cron expression first'); return; }
    try {
      await create.mutateAsync({ cronExpression: cron.trim(), prompt: prompt.trim(), telegramDispatch });
      setCron(''); setPrompt(''); setTelegramDispatch('owner'); setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? err?.message ?? 'Failed to create schedule');
    }
  }

  async function handleToggle(s: AgentSchedule) {
    await update.mutateAsync({ scheduleId: s.id, dto: { enabled: !s.enabled } });
  }

  async function handleDelete(s: AgentSchedule) {
    if (!confirm(`Delete schedule "${s.prompt.slice(0, 50)}"?`)) return;
    await remove.mutateAsync(s.id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={18} className="text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-zinc-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">Scheduled Runs</span>
          <span className="text-xs text-zinc-500">({schedules.length})</span>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Plus size={12} /> New schedule
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 p-4 space-y-4">

          {/* Cron field */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500">Schedule</label>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.cron}
                  type="button"
                  onClick={() => setCron(p.cron)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    cron === p.cron
                      ? 'bg-violet-600/15 border-violet-500/40 text-violet-600 dark:text-violet-300'
                      : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:border-gray-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Raw input */}
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="or type a custom expression, e.g. 0 9 * * *"
              className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.06] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            />

            {/* Live description */}
            {cronDesc && (
              <div className={`flex items-center gap-1.5 text-xs ${cronDesc.valid ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {cronDesc.valid
                  ? <CheckCircle2 size={12} />
                  : <AlertCircle size={12} />}
                {cronDesc.text}
              </div>
            )}
          </div>

          {/* Telegram dispatch */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500">Telegram dispatch</label>
            <div className="grid grid-cols-2 gap-1.5">
              {DISPATCH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTelegramDispatch(opt.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    telegramDispatch === opt.value
                      ? 'bg-violet-600/15 border-violet-500/40 text-violet-600 dark:text-violet-300'
                      : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:border-gray-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="mt-0.5 text-[10px] leading-tight opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Summarize the latest news and post a brief update."
              rows={3}
              className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.06] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={create.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
            >
              {create.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Create
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {schedules.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock size={24} className="text-gray-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-zinc-500">No schedules yet</p>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Schedules run the agent automatically on a cron schedule.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => {
            const desc = describeCron(s.cronExpression);
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                  s.enabled
                    ? 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900'
                    : 'border-gray-100 dark:border-white/[0.04] bg-gray-50 dark:bg-zinc-950 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded">
                      {s.cronExpression}
                    </code>
                    {desc.valid && (
                      <span className="text-xs text-gray-500 dark:text-zinc-500">{desc.text}</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-zinc-600 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {DISPATCH_OPTIONS.find((d) => d.value === s.telegramDispatch)?.label ?? 'Owner only'}
                    </span>
                    {!s.enabled && (
                      <span className="text-xs text-gray-400 dark:text-zinc-600">paused</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-zinc-300 break-words">{s.prompt}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600">
                    Last run: {formatLastRun(s.lastRunAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(s)}
                    disabled={update.isPending}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
                    title={s.enabled ? 'Pause' : 'Resume'}
                  >
                    {s.enabled
                      ? <ToggleRight size={16} className="text-violet-500" />
                      : <ToggleLeft size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={remove.isPending}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
