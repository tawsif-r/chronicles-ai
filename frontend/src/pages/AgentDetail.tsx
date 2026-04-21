import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Activity, Brain, Play, Square, Save, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useAgent, useStartAgent, useStopAgent, useUpdateAgent } from '../hooks/useAgents';
import StatusBadge from '../components/StatusBadge';
import ChannelManager from '../components/ChannelManager';
import ScheduleManager from '../components/ScheduleManager';

type Tab = 'soul' | 'tools' | 'identity' | 'heartbeat' | 'channels' | 'schedules';
const tabs: { id: Tab; label: string }[] = [
  { id: 'soul', label: 'SOUL.md' },
  { id: 'tools', label: 'TOOLS.md' },
  { id: 'identity', label: 'IDENTITY.md' },
  { id: 'heartbeat', label: 'HEARTBEAT.md' },
  { id: 'channels', label: 'Channels' },
  { id: 'schedules', label: 'Schedules' },
];

const TAB_PLACEHOLDERS: Record<string, string> = {
  soul: `# SOUL.md — Personality & Instructions
# ─────────────────────────────────────────
# This is the most important file. Write instructions for your agent here —
# who it is, how it should behave, what topics to focus on, and what to avoid.
# Think of it as the employee handbook you hand to your AI.

You are [agent name], a [role] for [company or purpose].

Your job is to [describe the main task].

Tone: [e.g. friendly and professional / casual / formal]

Rules:
- [Rule 1]
- [Rule 2]
- [Rule 3]

Do NOT discuss: [off-limits topics]`,

  tools: `# TOOLS.md — Capabilities (Claude only)
# ─────────────────────────────────────────
# Define what actions this agent can take beyond chatting.
# Must be a valid JSON array. Leave empty if you don't need tools.
# Tools only work with Claude (Anthropic) models.
#
# Built-in tools: http_request · read_memory · write_memory

[
  {
    "name": "http_request",
    "description": "Fetch live data from a URL when the user asks about current information or anything that changes over time.",
    "input_schema": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "description": "The full URL to fetch" },
        "method": { "type": "string", "enum": ["GET", "POST"] }
      },
      "required": ["url"]
    }
  }
]`,

  identity: `# IDENTITY.md — Appearance & Description
# ─────────────────────────────────────────
# The agent's "business card". Describes how it appears and introduces itself.
# This does not affect how the AI thinks — that's SOUL.md's job.
# Leave empty if you don't need a custom persona.

Name: [Display name]
Role: [e.g. Customer Support Agent at Acme Corp]
Audience: [Who uses this agent]

Description:
[2–3 sentences describing what this agent does and who it's for]

First message:
"[How the agent should greet a new user]"`,

  heartbeat: `# HEARTBEAT.md — Schedule Notes
# ─────────────────────────────────────────
# Context and instructions for when this agent runs on a schedule.
# The actual schedule timing is set in the Schedules tab — this is just notes.
# Leave empty if you only use this agent for manual chat.

Scheduled Task: [Task name]
Runs: [e.g. Every weekday at 9:00 AM]
Sends to: [e.g. #team-updates on Slack]

What to include:
1. [Item 1]
2. [Item 2]
3. [Item 3]

Format: [e.g. Keep under 200 words, use bullet points]
Tone: [e.g. Professional and concise]`,
};

interface TabGuide {
  title: string;
  tagline: string;
  description: string;
  example: string;
  exampleLabel: string;
}

const TAB_GUIDES: Partial<Record<Tab, TabGuide>> = {
  soul: {
    title: 'SOUL.md — Personality & Instructions',
    tagline: 'The most important file. Defines who your agent is and how it behaves.',
    description:
      "Write instructions here as if you're onboarding a new employee. Tell the agent its role, tone of voice, what topics to focus on, and any rules it must follow. The AI reads this before every single message it sends.",
    exampleLabel: 'Customer support agent',
    example: `You are Aria, a friendly customer support agent for Launchpad.

Your job is to help users with billing questions and account issues.

Tone: Warm, professional, and patient. Never dismissive.

Rules:
- Always ask for the user's order ID before discussing a refund.
- Never promise refunds — say "I'll flag this for our billing team."
- Keep responses under 150 words unless a detailed walkthrough is needed.
- If you don't know the answer, say so and offer to escalate.

Do NOT discuss: technical bugs, feature requests, or sales.
For those, direct users to: support@launchpad.com`,
  },

  tools: {
    title: 'TOOLS.md — Capabilities',
    tagline: 'Give your agent the ability to take actions — fetch URLs, remember things, and more.',
    description:
      'By default an agent can only chat. Tools let it do things: look up live data, save notes across conversations, or call external APIs. Must be valid JSON. Only works with Claude (Anthropic) models — leave empty for GPT or other providers.',
    exampleLabel: 'Agent that can fetch URLs and remember things',
    example: `[
  {
    "name": "http_request",
    "description": "Fetch live data from a URL when the user asks about current information.",
    "input_schema": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "description": "The full URL to fetch" },
        "method": { "type": "string", "enum": ["GET", "POST"] }
      },
      "required": ["url"]
    }
  },
  {
    "name": "read_memory",
    "description": "Read your long-term memory to recall user preferences or past context.",
    "input_schema": { "type": "object", "properties": {} }
  },
  {
    "name": "write_memory",
    "description": "Save important information to remember in future conversations.",
    "input_schema": {
      "type": "object",
      "properties": {
        "content": { "type": "string", "description": "Everything to save (overwrites previous memory)" }
      },
      "required": ["content"]
    }
  }
]`,
  },

  identity: {
    title: 'IDENTITY.md — Appearance & Description',
    tagline: "Your agent's business card — display name, description, and how it introduces itself.",
    description:
      "This doesn't change how the AI thinks (that's SOUL.md). It's metadata about who the agent is and how it greets new users. Leave empty if you don't need a custom persona.",
    exampleLabel: 'Customer support persona',
    example: `Name: Aria
Role: Customer Support Specialist at Launchpad
Audience: Launchpad app users with billing and account questions

Description:
Aria helps users resolve account issues quickly,
without the frustration of long wait times.

First message:
"Hi! I'm Aria, Launchpad's support assistant. How can I help you today?"`,
  },

  heartbeat: {
    title: 'HEARTBEAT.md — Schedule Notes',
    tagline: 'Context for when your agent runs on an automated schedule.',
    description:
      "The actual schedule timing is set in the Schedules tab. This file is just notes your agent reads before each scheduled run — like a shift briefing. Leave empty if you only use this agent for manual chat.",
    exampleLabel: 'Daily morning briefing',
    example: `Scheduled Task: Daily Morning Briefing
Runs: Every weekday at 8:00 AM
Sends to: #team-updates (Slack)

What to include:
1. Today's date and a one-sentence motivational opener
2. 3 things the team should focus on today
3. Any upcoming deadlines

Format: Under 200 words. Bullet points.
Tone: Energetic but professional.`,
  },
};

const fieldMap: Record<string, 'soulMd' | 'toolsMd' | 'identityMd' | 'heartbeatMd'> = {
  soul: 'soulMd', tools: 'toolsMd', identity: 'identityMd', heartbeat: 'heartbeatMd',
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading } = useAgent(id!);
  const start = useStartAgent(id!);
  const stop = useStopAgent(id!);
  const update = useUpdateAgent(id!);
  const [activeTab, setActiveTab] = useState<Tab>('soul');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showExample, setShowExample] = useState(false);

  if (isLoading || !agent) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-100 dark:bg-zinc-900 rounded-lg animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const field = fieldMap[activeTab];
  const value = field ? (draft[field] ?? agent[field]) : '';
  const isDirty = !!field && field in draft && draft[field] !== agent[field];

  async function handleSave() {
    await update.mutateAsync({ [field]: value });
    setDraft((d) => { const n = { ...d }; delete n[field]; return n; });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isRunning = agent.status === 'running';

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-8 h-16 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-transparent">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-600">{agent.modelProvider} · {agent.modelName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/agents/${id}/chat`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors">
            <MessageSquare size={12} /> Chat
          </Link>
          <Link to={`/agents/${id}/logs`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors">
            <Activity size={12} /> Logs
          </Link>
          <Link to={`/agents/${id}/memory`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors">
            <Brain size={12} /> Memory
          </Link>
          {isRunning ? (
            <button onClick={() => stop.mutate()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 transition-colors">
              <Square size={11} /> Stop
            </button>
          ) : (
            <button onClick={() => start.mutate()} disabled={agent.status === 'starting'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 transition-colors disabled:opacity-40">
              <Play size={11} /> Start
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 lg:px-8 h-12 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-transparent overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setShowGuide(false); setShowExample(false); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]'}`}
          >
            {t.label}
          </button>
        ))}
        {/* Guide toggle — only for md tabs */}
        {TAB_GUIDES[activeTab] && (
          <button
            onClick={() => { setShowGuide(g => !g); setShowExample(false); }}
            title={showGuide ? 'Hide guide' : 'Show guide'}
            className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${showGuide ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]'}`}
          >
            <Info size={13} />
            Guide
          </button>
        )}
      </div>

      {/* Guide panel */}
      {showGuide && TAB_GUIDES[activeTab] && (() => {
        const guide = TAB_GUIDES[activeTab]!;
        return (
          <div className="shrink-0 border-b border-gray-200 dark:border-white/[0.06] bg-violet-50/60 dark:bg-violet-950/20">
            <div className="px-4 lg:px-8 py-4 max-w-3xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{guide.title}</p>
                  <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-0.5">{guide.tagline}</p>
                </div>
                <button onClick={() => setShowGuide(false)} className="shrink-0 p-1 rounded text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed mb-3">{guide.description}</p>

              {/* Example toggle */}
              <button
                onClick={() => setShowExample(e => !e)}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                {showExample ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showExample ? 'Hide example' : `Show example — ${guide.exampleLabel}`}
              </button>

              {showExample && (
                <pre className="mt-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] text-xs text-gray-700 dark:text-zinc-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {guide.example}
                </pre>
              )}
            </div>
          </div>
        );
      })()}

      {/* Editor / Channel Manager */}
      <div className="flex-1 relative overflow-hidden overflow-y-auto">
        {activeTab === 'channels' ? (
          <ChannelManager agentId={id!} channels={agent.channels} />
        ) : activeTab === 'schedules' ? (
          <ScheduleManager agentId={id!} />
        ) : (
          <textarea
            value={value}
            onChange={(e) => setDraft((d) => ({ ...d, [field!]: e.target.value }))}
            className="absolute inset-0 w-full h-full p-6 lg:p-8 bg-transparent text-sm text-gray-800 dark:text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none placeholder-gray-300 dark:placeholder-zinc-700"
            placeholder={TAB_PLACEHOLDERS[activeTab] ?? `# ${activeTab.toUpperCase()}.md\n\n...`}
            spellCheck={false}
          />
        )}
      </div>

      {/* Save bar */}
      {(isDirty || saved) && (
        <div className="shrink-0 flex items-center justify-between px-4 lg:px-8 h-12 bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-white/[0.06]">
          <span className="text-xs text-gray-500 dark:text-zinc-500">{saved ? '✓ Saved' : 'Unsaved changes'}</span>
          <button onClick={handleSave} disabled={update.isPending || !isDirty} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50">
            <Save size={12} />
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
