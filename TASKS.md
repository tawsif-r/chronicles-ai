# TASKS.md — ChroniclesAI Work Log

> Updated at the end of every session. Pick up from here on next start.

---

## Current Status
**Full stack functional.** Backend :3000 · Frontend :5173 · Postgres + Redis in Docker.
Auth, agent CRUD, inline chat, and API key management all working.

---

## Recently Completed (Session — April 16 2026)

### ✅ Inline LLM Architecture (replaced OpenClaw child processes)
- Removed OpenClaw package from monorepo
- Implemented LLmService routing to @anthropic-ai/sdk and OpenAI SDK
- ChatService now calls LLmService inline (no HTTP proxy, no child process spawn)
- Agent start/stop flip status in DB (no process lifecycle management)
- Chat history persisted to chat_message table
- API keys decrypted at request time, never logged

### ✅ Fixed Chat Flow End-to-End
- ChatService loads last 100 messages from DB as context
- LLmService routes correctly based on agent.modelProvider
- Explicit API key validation with clear error messages
- Frontend error banner shows backend errors (no silent failures)

### ✅ Network Access (LAN)
- Backend listening on 0.0.0.0:3000
- Frontend Vite on 0.0.0.0:5173
- CORS updated to allow local network IPs
- Accessible from peer machines on same network (192.168.3.35:5173)

### ✅ Removed Redundant API Key Field
- Agent creation form no longer has inline API key field
- Users manage keys globally in Settings (one set per workspace)
- All agents in workspace share same keys

### ✅ Improved .gitignore
- Organized into sections: Build output, Secrets, Logs, Caches, IDE, Docker, Workspace data
- Untracked backend/dist/ from git (was committed before proper .gitignore)
- Added `**/.vite/`, `/workspaces/`, `/tmp/`

---

## Next Tasks (v1.1 → v1.2)

### 🔲 Implement Telegram channel module
- TelegramModule listening to webhook at POST /webhooks/telegram/:token
- TelegramService sends/receives via telegraf or node-telegram-bot-api
- Routes messages to ChatService.sendMessage()
- Persist channel config in AgentChannel table (token, chat ID mapping)

### 🔲 Implement Slack channel module
- SlackModule listening to Slack Events API (message event)
- SlackService sends/receives via @slack/bolt
- Routes messages to ChatService.sendMessage()
- Persist channel config (team ID, bot token, channel ID)

### 🔲 Implement WhatsApp channel module
- WhatsappModule listening to webhook (Twilio or Meta Business API)
- WhatsappService sends/receives via twilio or whatsapp-api
- Routes messages to ChatService.sendMessage()

### 🔲 Implement Discord channel module
- DiscordModule using discord.js
- Routes messages to ChatService.sendMessage()

### 🔲 Production hardening
- TypeORM: generate migration, set `synchronize: false`
- Environment checklist: all secrets in env, no defaults
- PM2 config for backend + graceful shutdown
- Database backup strategy

### 🔲 Streaming chat responses (optional for v1.2)
- Switch ChatController from request/response to SSE (Server-Sent Events)
- Frontend switches to stream consumption instead of single response

---

## How to Run

```bash
# 1. Start infra
docker compose up postgres redis -d

# 2. Backend
pnpm dev:backend   # :3000

# 3. Frontend
pnpm dev:frontend  # :5173
```

See `design.md → Running Locally` for full setup steps.

---

## Key Files (for reference)

| File | Purpose |
|---|---|
| `backend/src/llm/llm.service.ts` | Routes to LLM provider SDKs |
| `backend/src/chat/chat.service.ts` | Chat message handling + history |
| `backend/src/api-keys/api-keys.service.ts` | Key encryption/decryption |
| `backend/src/runtime/runtime.service.ts` | Agent status flip (no processes) |
| `frontend/src/pages/AgentChat.tsx` | Chat UI + optimistic updates |
| `architecture-decisions.md` | Key decisions (ADR-002 onwards) |
| `design.md` | Full system reference |
