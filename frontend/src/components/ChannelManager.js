import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, Plus, Hash, Pencil, Info } from 'lucide-react';
import { useAddChannel, useRemoveChannel, useUpdateChannel } from '../hooks/useAgents';
const CHANNEL_LABELS = {
    slack: 'Slack',
    telegram: 'Telegram',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
};
const CHANNEL_FORMS = {
    slack: {
        label: 'New Slack Channel',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', secret: true },
            { key: 'signingSecret', label: 'Signing Secret', placeholder: 'From Slack app settings', secret: true },
            { key: 'slackChannelId', label: 'Channel ID', placeholder: 'C0123ABCDEF' },
            { key: 'teamId', label: 'Team ID', placeholder: 'T0123ABCDEF' },
        ],
    },
    telegram: {
        label: 'New Telegram Channel',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: '123456789:ABC...', secret: true },
            { key: 'chatId', label: 'Chat ID', placeholder: '123456789' },
        ],
    },
    discord: {
        label: 'New Discord Channel',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: 'MTk4NjIyNDgzNTgxODI4...', secret: true },
            { key: 'userId', label: 'User ID', placeholder: '123456789012345678' },
        ],
    },
    whatsapp: {
        label: 'New WhatsApp Channel',
        fields: [
            { key: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
            { key: 'authToken', label: 'Auth Token', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
            { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890' },
        ],
    },
};
const CHANNEL_GUIDES = {
    telegram: {
        steps: [
            { text: '1. Create bot — open Telegram, message @BotFather, send /newbot and follow prompts. Copy the token.' },
            { text: '2. Get your Chat ID — send any message to your bot, then open:', code: 'https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates' },
            { text: '   Find "chat":{"id": 123456789} — that number is your Chat ID.' },
            { text: '3. Expose local backend with ngrok:', code: 'ngrok http 3000' },
            { text: '4. Register webhook (paste ngrok URL + your token):', code: 'https://api.telegram.org/bot<TOKEN>/setWebhook?url=<NGROK_URL>/api/webhooks/telegram/<TOKEN>' },
            { text: '5. Verify webhook active:', code: 'https://api.telegram.org/bot<TOKEN>/getWebhookInfo' },
        ],
    },
    slack: {
        steps: [
            { text: '1. Create Slack app at https://api.slack.com/apps → "Create New App" → "From scratch".' },
            { text: '2. Bot Token — go to "OAuth & Permissions", add bot scopes (chat:write, channels:history), install app. Copy "Bot User OAuth Token" (xoxb-...).' },
            { text: '3. Signing Secret — go to "Basic Information" → "App Credentials". Copy "Signing Secret".' },
            { text: '4. Channel ID — right-click channel in Slack → "View channel details" → copy ID at bottom (starts with C).' },
            { text: '5. Team ID — in Slack workspace URL: https://app.slack.com/client/TXXXXXXXX (starts with T).' },
            { text: '6. Set Event Subscriptions URL in Slack app settings:', code: 'https://<YOUR_DOMAIN>/api/webhooks/slack/events' },
            { text: '7. Subscribe to bot event: message.channels under "Event Subscriptions".' },
        ],
    },
    discord: {
        steps: [
            { text: '1. Create app at https://discord.com/developers/applications → "New Application".' },
            { text: '2. Go to "Bot" tab → "Add Bot" → "Reset Token" → copy the token.' },
            { text: '3. Enable "Message Content Intent" under Privileged Gateway Intents on the Bot tab.' },
            { text: '4. Get your Discord User ID — in Discord: Settings → Advanced → enable Developer Mode, then right-click your username → "Copy User ID".' },
            { text: '5. Invite bot to server using OAuth2 URL with bot + applications.commands scopes.' },
        ],
    },
    whatsapp: {
        steps: [
            { text: '1. Create Twilio account at https://twilio.com and verify your phone number.' },
            { text: '2. Account SID + Auth Token — on Twilio Console Dashboard: https://console.twilio.com' },
            { text: '3. Get a WhatsApp-enabled number: Twilio Console → Messaging → Senders → WhatsApp Senders.' },
            { text: '4. Set webhook URL in Twilio Console → Messaging → Settings → WhatsApp number settings:', code: 'https://<YOUR_DOMAIN>/api/webhooks/whatsapp' },
            { text: '5. Phone Number — enter the Twilio number in E.164 format, e.g. +14155552671.' },
        ],
    },
};
export default function ChannelManager({ agentId, channels }) {
    const addChannel = useAddChannel(agentId);
    const removeChannel = useRemoveChannel(agentId);
    const updateChannel = useUpdateChannel(agentId);
    const [showForm, setShowForm] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const [selectedType, setSelectedType] = useState('slack');
    const [fields, setFields] = useState({});
    const [error, setError] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const currentForm = CHANNEL_FORMS[selectedType];
    function initForm(type) {
        setEditingChannel(null);
        setSelectedType(type);
        const form = CHANNEL_FORMS[type];
        const newFields = {};
        form.fields.forEach((f) => {
            newFields[f.key] = '';
        });
        setFields(newFields);
        setShowForm(true);
        setError('');
        setShowGuide(false);
    }
    function startEdit(ch) {
        setEditingChannel(ch);
        setSelectedType(ch.channelType);
        const form = CHANNEL_FORMS[ch.channelType];
        const newFields = {};
        form.fields.forEach((f) => {
            newFields[f.key] = ch.config[f.key] || '';
        });
        setFields(newFields);
        setShowForm(true);
        setError('');
        setShowGuide(false);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        const form = CHANNEL_FORMS[selectedType];
        if (editingChannel) {
            // Edit mode: secret fields can be left blank to keep existing
            const mergedConfig = { ...editingChannel.config };
            let hasNonSecretChanges = false;
            form.fields.forEach((f) => {
                if (!f.secret && !fields[f.key]?.trim()) {
                    setError(`${f.label} is required.`);
                    hasNonSecretChanges = true;
                    return;
                }
                if (fields[f.key]?.trim()) {
                    mergedConfig[f.key] = fields[f.key];
                    hasNonSecretChanges = true;
                }
            });
            if (hasNonSecretChanges && error)
                return;
            try {
                await updateChannel.mutateAsync({
                    channelId: editingChannel.id,
                    dto: { config: mergedConfig },
                });
                setShowForm(false);
                setEditingChannel(null);
            }
            catch {
                setError('Failed to update channel.');
            }
        }
        else {
            // Add mode: all fields required
            const allFilled = form.fields.every((f) => fields[f.key]?.trim());
            if (!allFilled) {
                setError('All fields required.');
                return;
            }
            try {
                await addChannel.mutateAsync({
                    channelType: selectedType,
                    config: { ...fields },
                });
                setShowForm(false);
            }
            catch {
                setError('Failed to add channel.');
            }
        }
    }
    return (_jsxs("div", { className: "p-6 lg:p-8 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: "Channels" }), !showForm && (_jsx("div", { className: "flex gap-1", children: ['slack', 'telegram', 'discord', 'whatsapp'].map((type) => (_jsxs("button", { onClick: () => initForm(type), className: "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors", children: [_jsx(Plus, { size: 12 }), " ", CHANNEL_LABELS[type]] }, type))) }))] }), showForm && (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-3 p-4 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-zinc-900", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1", children: editingChannel ? `Edit ${CHANNEL_LABELS[selectedType] ?? selectedType} Channel` : currentForm.label }), !editingChannel && CHANNEL_GUIDES[selectedType] && (_jsxs("div", { className: "mb-1", children: [_jsxs("button", { type: "button", onClick: () => setShowGuide((v) => !v), className: "flex items-center gap-1 text-xs text-violet-500 dark:text-violet-400 hover:underline", children: [_jsx(Info, { size: 11 }), showGuide ? 'Hide setup guide' : 'How to set up'] }), showGuide && (_jsx("div", { className: "mt-2 space-y-1.5 p-3 rounded-lg bg-violet-50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10 text-xs text-gray-600 dark:text-zinc-400", children: CHANNEL_GUIDES[selectedType].steps.map((step, i) => (_jsxs("div", { children: [_jsx("p", { className: "leading-relaxed", children: step.text }), step.code && (_jsx("code", { className: "block mt-0.5 px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.08] font-mono text-violet-600 dark:text-violet-300 break-all select-all", children: step.code }))] }, i))) }))] })), currentForm.fields.map(({ key, label, placeholder, secret }) => (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-500 dark:text-zinc-500 mb-1", children: label }), _jsx("input", { type: secret ? 'password' : 'text', value: fields[key] ?? '', onChange: (e) => setFields((f) => ({ ...f, [key]: e.target.value })), placeholder: editingChannel && secret ? 'Leave blank to keep existing' : placeholder, className: "w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500" })] }, key))), error && _jsx("p", { className: "text-xs text-red-500", children: error }), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsx("button", { type: "submit", disabled: editingChannel ? updateChannel.isPending : addChannel.isPending, className: "px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50", children: editingChannel
                                    ? (updateChannel.isPending ? 'Saving…' : 'Save Changes')
                                    : (addChannel.isPending ? 'Saving…' : 'Save Channel') }), _jsx("button", { type: "button", onClick: () => { setShowForm(false); setEditingChannel(null); setError(''); }, className: "px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors", children: "Cancel" })] })] })), channels.length === 0 && !showForm && (_jsx("p", { className: "text-xs text-gray-400 dark:text-zinc-600", children: "No channels configured." })), channels.length > 0 && (_jsx("ul", { className: "space-y-2", children: channels.map((ch) => (_jsxs("li", { className: "flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Hash, { size: 13, className: "text-violet-400 shrink-0" }), _jsxs("div", { children: [_jsx("span", { className: "text-xs font-medium text-gray-900 dark:text-white", children: CHANNEL_LABELS[ch.channelType] ?? ch.channelType }), (ch.config.slackChannelId || ch.config.chatId || ch.config.userId || ch.config.phoneNumber) && (_jsx("span", { className: "ml-2 text-xs text-gray-400 dark:text-zinc-500 font-mono", children: ch.config.slackChannelId || ch.config.chatId || ch.config.userId || ch.config.phoneNumber }))] }), !ch.enabled && (_jsx("span", { className: "text-xs text-amber-500 dark:text-amber-400", children: "disabled" }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => startEdit(ch), disabled: updateChannel.isPending, className: "p-1.5 rounded-md text-gray-400 dark:text-zinc-600 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-40", children: _jsx(Pencil, { size: 12 }) }), _jsx("button", { onClick: () => removeChannel.mutate(ch.id), disabled: removeChannel.isPending, className: "p-1.5 rounded-md text-gray-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40", children: _jsx(Trash2, { size: 12 }) })] })] }, ch.id))) }))] }));
}
