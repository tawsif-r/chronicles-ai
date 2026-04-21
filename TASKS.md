# TASKS.md — ChroniclesAI Work Log

> Updated at the end of every session. Pick up from here on next start.

---

## Current Status
**Full stack + channels + scheduled agents functional.** Backend :3000 · Frontend :5173 · Postgres + Redis in Docker.
Auth, agent CRUD, inline chat, live logs, API key management, all four channel modules, billing, Swagger, **scheduled agents**, and code-review-graph all working.

---

## Recently Completed (Session — April 20 2026)

### ✅ Scheduled Agents
- New `SchedulesModule` with Bull repeatable jobs (Redis-backed, survive restarts)
- `AgentSchedule` entity: cronExpression, prompt, enabled, lastRunAt, workspaceId (denormalized)
- CRUD endpoints: `GET/POST /api/agents/:id/schedules`, `PATCH/DELETE /api/agents/:id/schedules/:sid`
- `ScheduleProcessor`: fires on cron → `ChatService.sendMessage` → logs → channel dispatch
- Channel dispatch: Slack (`sendMessage`), Telegram (`sendOutbound`), Discord (`sendOutbound`) — WhatsApp skipped (no stored recipient)
- Billing-metered: scheduled runs count against monthly message limit
- Frontend: `ScheduleManager` component in new Schedules tab on AgentDetail page
- 6 unit tests (create/remove/update/onModuleInit)

### ✅ Agent Logs Wired to Chat + Runtime
- `LogsService` injected into `ChatService` and `RuntimeService`
- Chat logs: message received (info), LLM call (debug), reply generated (info), error (error)
- Runtime logs: agent started / stopped / restarted (info)
- Graceful degradation: log failures never break chat or lifecycle
- `useLiveLogs` hook loads HTTP history before connecting WebSocket

### ✅ Agent Sub-Page Navigation Tabs
- Tab bar on AgentChat, AgentLogs, AgentMemory: Overview / Chat / Logs / Memory
- Active tab highlighted in violet, direct jump between pages

### ✅ Chat History Pagination Fix
- `useChat.ts` now fetches `limit=200` (was 50)
- Root cause: users with >50 messages saw new replies disappear (landed on page 2)

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

## Next Tasks (v1.5) — Core Agent Upgrades

### 🔲 Streaming Chat Responses
**Why:** Agents feel slow with a 3–8s blank wait. Streaming shows tokens as they arrive.
- Switch `ChatController.send()` to SSE (`@Sse`)
- `LlmService`: add `chatStream()` returning `AsyncIterable<string>` using Anthropic/OpenAI stream APIs
- Frontend: replace single `fetch` with `EventSource`, append tokens to message bubble
- Files: `chat.controller.ts`, `llm.service.ts`, `AgentChat.tsx`, `useChat.ts`

### ✅ Tool Use / Function Calling
**Why:** Without tools, agents can only talk — they can't *do* anything. This is the biggest capability gap.
- `Agent.toolsMd` already exists but is ignored — parse it as JSON/YAML tool definitions
- `LlmService.chat()`: pass `tools[]` to Anthropic/OpenAI, detect `tool_use` blocks in response
- Add agentic loop in `ChatService`: if LLM returns tool call → execute tool → feed result back → re-call LLM
- Built-in tools to start: `http_request`, `read_memory`, `write_memory`, `search_web`
- Files: `llm.service.ts`, `chat.service.ts`, `agent.entity.ts`, new `tools/` module

### 🔲 LLM Parameters Per Agent
**Why:** `max_tokens` is hardcoded at 4096, temperature is provider default — no per-agent tuning.
- Add columns to `Agent` entity: `temperature` (float, default 1.0), `maxTokens` (int, default 4096), `topP` (float, nullable)
- Pass through in `LlmService.chat()` for all providers
- Add sliders/fields to `AgentNew.tsx` and `AgentDetail.tsx`
- Files: `agent.entity.ts`, `llm.service.ts`, `AgentNew.tsx`, `AgentDetail.tsx`, shared DTOs

### 🔲 Memory Injection (fix existing system)
**Why:** `MEMORY.md` is written to disk but never read by `ChatService` — memory does nothing today.
- In `ChatService.sendMessage()`: load `MEMORY.md` from `workspace.diskPath/agents/{id}/MEMORY.md`
- Inject as a system-level message before conversation history: `[system_memory, ...history, user_msg]`
- After each reply, optionally append summary line to `MEMORY.md` (agent-driven via tool or auto-summarize)
- Files: `chat.service.ts`, `agents.service.ts` (already has `getMemory`/`setMemory`)

### 🔲 Prompt Caching (Anthropic)
**Why:** Long system prompts + memory re-sent every message = expensive. Anthropic caches prompts for 5 min at 10% cost.
- Add `cache_control: { type: "ephemeral" }` to system prompt block in `callAnthropic()`
- Track cache hit/miss in logs
- File: `llm.service.ts:70`

---

## Next Tasks (v1.6) — Broader Capabilities

### 🔲 File Attachments + Vision
**Why:** Agents can't see images, PDFs, or documents — limits use cases like document Q&A, image analysis.
- New endpoint: `POST /api/agents/:id/files` (multipart, store to disk or S3)
- Vision-capable models (claude-3.x, gpt-4o): pass image as base64 content block
- PDF: extract text via `pdf-parse`, inject into context
- Frontend: file drag-drop in `AgentChat.tsx`
- Files: new `files/` module, `chat.service.ts`, `llm.service.ts`, `AgentChat.tsx`

### 🔲 Token Usage & Cost Tracking
**Why:** No visibility into how much each agent costs. Billing only counts messages, not tokens.
- Anthropic + OpenAI both return `usage: { input_tokens, output_tokens }` in response
- Save to new `LlmUsage` entity: agentId, provider, model, inputTokens, outputTokens, cost, timestamp
- Show per-agent token usage in `AgentDetail.tsx` → Usage tab
- Files: `llm.service.ts`, new `usage/` module, `AgentDetail.tsx`

### 🔲 Outbound Webhooks
**Why:** Agents can reply on channels but can't push events to external systems (CRMs, Zapier, custom APIs).
- New `WebhookEndpoint` entity: agentId, url, secret, events (message_sent, schedule_run, error)
- `WebhooksService.dispatch()` — HMAC-signed POST on agent events
- Called from `ChatService` and `ScheduleProcessor` after each run
- Frontend: webhook config in `AgentDetail.tsx`
- Files: new `webhooks/` module

### 🔲 More LLM Providers
**Why:** Groq (fastest inference), Google Gemini (cheap + long context), Mistral — common asks.
- `LlmService`: add `callGroq()` (OpenAI-compat, just different baseURL + model names)
- Add `callGemini()` using `@google/generative-ai` SDK
- Update `ModelProvider` shared type: add `'groq' | 'gemini' | 'mistral'`
- Files: `llm.service.ts`, `shared/src/index.ts`, `AgentNew.tsx` model selector

### 🔲 RAG — Knowledge Base per Agent
**Why:** Agents can only use conversation history as context. RAG lets agents answer from uploaded documents.
- New `KnowledgeBase` entity: agentId, source (file/url), chunks, embeddings
- On document upload: chunk + embed using `text-embedding-3-small` or Ollama embed
- Store vectors in `pgvector` extension (already using Postgres)
- At chat time: embed user query, top-K similarity search, inject chunks before history
- Frontend: `AgentDetail.tsx` → Knowledge tab, file upload, URL crawl
- Files: new `rag/` module, `chat.service.ts`

### 🔲 Channel Features + Polish
- Channel enable/disable toggle (UI + backend logic)
- Channel test button — send test message to verify connection
- Proper error logging + retry for failed channel deliveries
- WhatsApp outbound for scheduled runs (store recipient number in config)

### 🔲 Extend Auto-Webhook Registration
- Slack: auto-register Event Subscriptions URL on channel creation
- Discord: auto-verify bot permissions on channel creation
- WhatsApp: auto-register webhook URL via Twilio API
- Same fail-fast pattern as Telegram

### 🔲 Schedule Enhancements
- Next-run preview in UI (compute from cron expression client-side)
- Run history per schedule (last N results with status)
- Schedule-level retry on failure (Bull retry config)

---

## Next Tasks (v1.7) — Advanced / Multi-Agent

### 🔲 Structured Output / JSON Mode
**Why:** Agents used as API backends (e.g. data extraction, classification) need guaranteed JSON output.
- Add optional `responseSchema` (JSON Schema) field to `Agent` entity
- If set: use Anthropic JSON mode / OpenAI `response_format: { type: "json_object" }`
- Validate LLM output against schema before saving; retry once on invalid
- Files: `agent.entity.ts`, `llm.service.ts`, `chat.service.ts`

### 🔲 Agent Templates / Marketplace
**Why:** New users see a blank form — no guidance on what makes a good agent.
- Seed DB with 5–10 pre-built agent templates (customer support, coding assistant, summarizer, translator)
- `GET /api/templates` endpoint returning template list
- "Create from template" button in Dashboard → pre-fills `AgentNew` form
- Files: new `templates/` module, `Dashboard.tsx`

### 🔲 Multi-Agent Delegation
**Why:** Complex tasks benefit from specialized sub-agents (planner → researcher → writer).
- Add `delegates: AgentRef[]` field to agent config
- `ChatService`: if LLM returns `delegate_to` tool call, route to another agent's `sendMessage`
- Pass response back as tool result to original agent
- Files: `chat.service.ts`, `llm.service.ts`, `agent.entity.ts`

### 🔲 Agent API Endpoint (public-facing)
**Why:** Developers want to call their agents from external apps without managing JWT.
- New `AgentApiKey` entity: per-agent static key (not the LLM provider keys)
- `POST /api/v1/agents/:slug/chat` — auth via `X-Agent-Key` header, no JWT required
- Rate-limited per key; counts against billing
- Files: new `agent-api/` module

---

## Production Hardening (ongoing)
- TypeORM: generate migration file, set `synchronize: false`
- PM2 config for backend + graceful shutdown hooks
- Rate limiting on `/api/chat` and all webhook endpoints (`@nestjs/throttler`)
- WEBHOOK_BASE_URL must be HTTPS in production (validate in `agents.service.ts`)
- Database backup strategy (pg_dump cron or managed DB)
- Environment checklist: no default secrets, all required vars validated on startup

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
