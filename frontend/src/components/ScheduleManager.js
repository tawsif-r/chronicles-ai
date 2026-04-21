import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '../hooks/useSchedules';
function formatLastRun(iso) {
    if (!iso)
        return 'Never';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
export default function ScheduleManager({ agentId }) {
    const { data: schedules = [], isLoading } = useSchedules(agentId);
    const create = useCreateSchedule(agentId);
    const update = useUpdateSchedule(agentId);
    const remove = useDeleteSchedule(agentId);
    const [showForm, setShowForm] = useState(false);
    const [cron, setCron] = useState('');
    const [prompt, setPrompt] = useState('');
    const [formError, setFormError] = useState(null);
    async function handleCreate() {
        setFormError(null);
        if (!cron.trim() || !prompt.trim()) {
            setFormError('Both fields required');
            return;
        }
        try {
            await create.mutateAsync({ cronExpression: cron.trim(), prompt: prompt.trim() });
            setCron('');
            setPrompt('');
            setShowForm(false);
        }
        catch (err) {
            setFormError(err?.response?.data?.message ?? err?.message ?? 'Failed to create schedule');
        }
    }
    async function handleToggle(s) {
        await update.mutateAsync({ scheduleId: s.id, dto: { enabled: !s.enabled } });
    }
    async function handleDelete(s) {
        if (!confirm(`Delete schedule "${s.prompt.slice(0, 50)}"?`))
            return;
        await remove.mutateAsync(s.id);
    }
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsx(Loader2, { size: 18, className: "text-zinc-500 animate-spin" }) }));
    }
    return (_jsxs("div", { className: "p-6 lg:p-8 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { size: 15, className: "text-zinc-500" }), _jsx("span", { className: "text-sm font-medium text-gray-900 dark:text-zinc-200", children: "Scheduled Runs" }), _jsxs("span", { className: "text-xs text-zinc-500", children: ["(", schedules.length, ")"] })] }), _jsxs("button", { onClick: () => { setShowForm((v) => !v); setFormError(null); }, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors", children: [_jsx(Plus, { size: 12 }), " New schedule"] })] }), showForm && (_jsxs("div", { className: "rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 p-4 space-y-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-500", children: "Cron expression" }), _jsx("input", { value: cron, onChange: (e) => setCron(e.target.value), placeholder: "0 9 * * *", className: "w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.06] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono" }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-zinc-600", children: ["min hour day month weekday \u2014 e.g. ", _jsx("code", { children: "0 9 * * *" }), " = daily at 9am \u00B7 ", _jsx("code", { children: "*/30 * * * *" }), " = every 30 min"] })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-500", children: "Prompt" }), _jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Summarize the latest news and post a brief update.", rows: 3, className: "w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.06] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" })] }), formError && (_jsx("p", { className: "text-xs text-red-500 dark:text-red-400", children: formError })), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: handleCreate, disabled: create.isPending, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors", children: [create.isPending ? _jsx(Loader2, { size: 11, className: "animate-spin" }) : _jsx(Plus, { size: 11 }), "Create"] }), _jsx("button", { onClick: () => { setShowForm(false); setFormError(null); }, className: "px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors", children: "Cancel" })] })] })), schedules.length === 0 && !showForm ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-center", children: [_jsx(Clock, { size: 24, className: "text-gray-300 dark:text-zinc-700 mb-3" }), _jsx("p", { className: "text-sm text-gray-500 dark:text-zinc-500", children: "No schedules yet" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-zinc-600 mt-1", children: "Schedules run the agent automatically on a cron schedule." })] })) : (_jsx("div", { className: "space-y-2", children: schedules.map((s) => (_jsxs("div", { className: `rounded-xl border p-4 flex items-start gap-3 transition-colors ${s.enabled
                        ? 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900'
                        : 'border-gray-100 dark:border-white/[0.04] bg-gray-50 dark:bg-zinc-950 opacity-60'}`, children: [_jsxs("div", { className: "flex-1 min-w-0 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("code", { className: "text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded", children: s.cronExpression }), !s.enabled && (_jsx("span", { className: "text-xs text-gray-400 dark:text-zinc-600", children: "paused" }))] }), _jsx("p", { className: "text-sm text-gray-800 dark:text-zinc-300 break-words", children: s.prompt }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-zinc-600", children: ["Last run: ", formatLastRun(s.lastRunAt)] })] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsx("button", { onClick: () => handleToggle(s), disabled: update.isPending, className: "p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors", title: s.enabled ? 'Pause' : 'Resume', children: s.enabled
                                        ? _jsx(ToggleRight, { size: 16, className: "text-violet-500" })
                                        : _jsx(ToggleLeft, { size: 16 }) }), _jsx("button", { onClick: () => handleDelete(s), disabled: remove.isPending, className: "p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors", title: "Delete", children: _jsx(Trash2, { size: 14 }) })] })] }, s.id))) }))] }));
}
