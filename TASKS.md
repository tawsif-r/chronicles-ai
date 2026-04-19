# TASKS.md — ChroniclesAI Work Log

> Updated at the end of every session. Pick up from here on next start.

---

## Current Status
**Full stack + channels functional.** Backend :3000 · Frontend :5173 · Postgres + Redis in Docker.
Auth, agent CRUD, inline chat, API key management, all four channel modules, **billing system**, **Swagger API docs**, and **code-review-graph dependency analysis** all working.

---

## Recently Completed (Session — April 19 2026)

### ✅ Fixed Login Bug + Subscription Schema
- **Root cause:** `WorkspacesService.createForUser` created workspace but never set `workspaceId` FK back on users table
- **Fix:** Injected UserRepository, saved user.workspace after creation. All 8 existing users backfilled via SQL UPDATE
- **Subscription/Payment entities:** Fixed TypeORM `externalId` field — added explicit `type: 'varchar'` (was rejecting `string | null` without type)

### ✅ Fixed Dark Mode Scrollbar
- Dark mode scrollbar track showing as nearly-black line (transparent track over zinc-950 body)
- **Fix:** Set explicit `background: #18181b` (zinc-900) for dark ::-webkit-scrollbar-track

### ✅ Swagger / OpenAPI Documentation
- Installed `@nestjs/swagger` v11 + enabled CLI plugin in nest-cli.json
- Configured Swagger in main.ts with JWT bearer auth, accessible at `http://localhost:3000/docs`
- Added `@ApiTags` to all 10 controllers (auth, agents, chat, billing, api-keys, skills, webhooks)
- Added `@ApiBearerAuth()` to protected endpoints
- CLI plugin auto-generates DTO schemas from class-validator decorators — zero manual @ApiProperty needed
- All 40+ endpoints now fully documented with parameters, request/response schemas, auth requirements

### ✅ code-review-graph Integration
- Installed `code-review-graph` via `pipx install`
- Built dependency graph: 541 nodes (222 functions, 148 tests, 108 files, 63 classes), 3,512 edges
- Queryable SQLite DB at `.code-review-graph/graph.db`
- Ready to use on cross-module tasks: query call graph, impact radius, find all callers/tests before reading files
- Confirmed it saves time on dependency queries vs. file-by-file exploration

---

## Recently Completed (Session — April 18 2026)

### ✅ Comprehensive Unit Test Suite (80 tests, 100% pass)
- Jest + ts-jest + @nestjs/testing configured
- 13 test suites across all backend modules
- Tests for services, controllers, SDK mocking, query builder mocking
- Zero real DB connections, zero real HTTP/SDK calls
- All channel webhooks tested (Slack, Telegram, Discord, WhatsApp)
- See `TESTING.md` for full test case breakdown

### ✅ Channel Edit UI + Update Endpoint
- Added `PATCH /api/agents/:id/channels/:channelId` endpoint
- Frontend edit form with pre-populated values from existing channel
- Pencil icon on each channel row opens inline edit form
- Secret fields optional in edit mode ("leave blank to keep existing")
- `useUpdateChannel()` hook + `agentsApi.updateChannel()` API call
- Update invalidates React Query cache, re-fetches agent

### ✅ Channel Setup Guides in UI
- Collapsible "How to set up" guide for each channel type
- Telegram: bot creation, Chat ID retrieval, ngrok exposure, webhook registration, verification
- Slack: app creation, token retrieval, channel/team IDs, webhook URL setup
- Discord: app creation, bot token, intents, user ID retrieval
- WhatsApp: Twilio account, credentials, webhook configuration
- Code snippets with exact URLs/commands for easy copy-paste
- Only shown when adding new channel (not in edit mode)

### ✅ Auto-Webhook Registration for Telegram
- On channel creation, backend auto-calls Telegram's `setWebhook` API
- Uses configurable `WEBHOOK_BASE_URL` env var (ngrok now, domain later)
- If webhook registration fails, channel save fails with error message
- No manual curl commands needed — everything happens in the app
- Easy migration to production domain — just update `.env`

### ✅ Delete Agent Button + Confirm Dialog
- Delete button on each agent card in dashboard
- Browser confirm dialog with agent name
- Deletes agent + related data via `DELETE /api/agents/:id`
- React Query invalidates list, card disappears

### ✅ Channel Modules (Slack, Telegram, Discord, WhatsApp)
- SlackModule with signature verification, message routing, reply via WebClient
- TelegramModule with bot token caching, webhook handler, Telegram SDK integration
- DiscordModule with persistent Discord.js client, DM channel detection, user lookup
- WhatsappModule with Twilio SDK, form-encoded webhook parsing, message sending
- AgentChannel CRUD endpoints: POST/DELETE /api/agents/:id/channels
- Frontend ChannelManager component with dynamic form fields per channel type
- Webhook routes marked @Public() for Slack/Telegram/Discord/WhatsApp to bypass JWT

### ✅ Type Sharing + Entity Updates
- CreateChannelDto exported from shared types
- Agent entity marked eager-load of channels relation
- AgentChannel queries use leftJoinAndSelect for workspace access in services

### ✅ Environment Setup
- main.ts enables rawBody: true for Slack signature verification
- ChatModule exports ChatService for injection in channel modules
- All channel modules registered in app.module.ts

## Previously Completed (Session — April 16 2026)

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

## Next Tasks (v1.3 → v1.4)

### 🔲 Extend Auto-Webhook Registration
- Slack: auto-register Event Subscriptions URL on channel creation
- Discord: auto-verify bot permissions on channel creation (or show instructions)
- WhatsApp: auto-register webhook URL on channel creation
- Same pattern as Telegram — fail fast if webhook registration fails

### 🔲 Production Hardening
- TypeORM: generate migration, set `synchronize: false`
- Environment checklist: all secrets in env, no defaults
- PM2 config for backend + graceful shutdown
- Database backup strategy
- Rate limiting on chat and webhook endpoints
- WEBHOOK_BASE_URL validation (must be HTTPS in prod, allow HTTP only in dev)

### 🔲 Streaming Chat Responses (optional for v1.2)
- Switch ChatController from request/response to SSE (Server-Sent Events)
- Frontend switches to stream consumption instead of single response
- Allow real-time message streaming from LLMs that support it

### 🔲 Channel Features + Polish
- Channel enable/disable toggle (UI + backend logic)
- Multi-channel support per agent (route to multiple channels from single chat)
- Channel test button — send test message to verify connection works
- Proper error logging for failed channel deliveries

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
