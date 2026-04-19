# design.md — ChroniclesAI

> **Purpose:** Living architecture reference. Written for human reading AND Claude Code context.
> Jump to any section by heading name.
>
> **Stack:** NestJS · React · PostgreSQL · Redis · Bull queues
> **Last updated:** April 2026

---

## Implementation Status

| Module | Files | Status |
|---|---|---|
| Monorepo scaffold | `pnpm-workspace.yaml`, `tsconfig.base.json`, `docker-compose.yml` | Done |
| Shared types | `shared/src/index.ts` | Done |
| Auth (register/login/refresh/JWT guard) | `backend/src/auth/` | Done |
| Users | `backend/src/users/` | Done |
| Workspaces (auto-create on register) | `backend/src/workspaces/` | Done |
| Agents CRUD | `backend/src/agents/` | Done |
| Runtime (status flip) | `backend/src/runtime/` | Done |
| LLM Service (inline calls) | `backend/src/llm/` | Done |
| Chat (inline LLM calls) | `backend/src/chat/` | Done |
| Logs (persist + Socket.io stream) | `backend/src/logs/` | Done |
| API Keys (AES-256-GCM encrypt/decrypt) | `backend/src/api-keys/` | Done |
| Skills registry | `backend/src/skills/` | Done |
| Billing (plans, usage tracking, message limits) | `backend/src/billing/` | Done — FREE/PRO/MAX tiers, Redis message counting, PlanLimitGuard |
| Swagger / OpenAPI docs | `backend/src/main.ts`, `nest-cli.json` | Done — accessible at `/docs`, JWT auth support, all endpoints documented |
| Slack channel module (Events API + signature verification) | `backend/src/slack/` | Done |
| Telegram channel module (webhook + bot token caching) | `backend/src/telegram/` | Done |
| Discord channel module (persistent client + DM routing) | `backend/src/discord/` | Done |
| WhatsApp channel module (Twilio + form parsing) | `backend/src/whatsapp/` | Done |
| Frontend routing + AuthContext | `frontend/src/App.tsx`, `contexts/` | Done |
| Frontend API client + hooks | `frontend/src/api/`, `hooks/` | Done |
| All pages (Login→Chat→Logs→Memory→Channels) | `frontend/src/pages/` | Done — fully styled with Tailwind v4 |
| UI components (Sidebar, AgentCard, StatusBadge, Layout, ChannelManager) | `frontend/src/components/` | Done — dark zinc + violet accent design system |
| Unit tests (services + controllers) | `backend/src/**/*.spec.ts` | Done — 80 tests, 100% pass (see `TESTING.md`) |
| Channel edit UI | `frontend/src/components/ChannelManager.tsx` | Done — inline edit form, pre-populated values |
| Channel setup guides | `frontend/src/components/ChannelManager.tsx` | Done — per-channel instructions with code snippets |
| Delete agent | `frontend/src/components/AgentCard.tsx` | Done — confirm dialog + delete button |
| Auto-webhook registration | `backend/src/agents/agents.service.ts` | Done — Telegram webhook registered on channel creation |

**Current state (April 19 2026):** Full stack + channels + billing + Swagger fully functional. Auth, agent CRUD, chat, logs, API key management, and all four channel modules (Slack, Telegram, Discord, WhatsApp) all working. Chat calls LLM inline via @anthropic-ai/sdk and OpenAI SDK. Agent start/stop flip status in DB (no child processes). Conversation history persisted to DB. Channels route messages through ChatService and reply via provider SDKs. All frontend pages fully styled (Tailwind v4, Inter font, dark minimal design). **Comprehensive unit test suite: 80 tests, 100% passing** (see `TESTING.md`). **Channel management**: edit existing channels, delete agents, auto-webhook registration on Telegram channel creation, embedded setup guides with code snippets for all channel types. **Billing system**: FREE/PRO/MAX plans seeded on startup, per-workspace message counting via Redis, route-level PlanLimitGuard with @PlanLimit() decorator. **Swagger API docs**: all 40+ endpoints documented with schemas, auto-generated from class-validator decorators, JWT auth support.

**Tooling:** code-review-graph dependency analysis integrated — 541-node call graph queryable via SQLite for cross-module task planning.

**Next:** Production hardening (migrations, env validation, rate limiting), extend auto-webhook registration to Slack/Discord/WhatsApp, and optional streaming responses (SSE).

---

## Running Locally

### Prerequisites
- Node.js 22+
- pnpm (`npm install -g pnpm`)
- Docker + Docker Compose

### 1. Install dependencies

```bash
cd /home/tawsif/Documents/chroniclesAi
pnpm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in the three secrets:

```
JWT_SECRET=<run: openssl rand -hex 32>
JWT_REFRESH_SECRET=<run: openssl rand -hex 32>
API_KEY_ENCRYPTION_SECRET=<run: openssl rand -hex 16>
```

Everything else (DATABASE_URL, REDIS_URL, ports) can stay as-is for local dev.

> **Note:** `WORKSPACE_BASE_PATH` defaults to `/tmp/chronicles-workspaces` in `.env`. This is fine for local dev — agent config files are written there at start time. Change it to a persistent path before any production use.

### 3. Start PostgreSQL + Redis

```bash
docker compose up postgres redis -d
```

### 4. Start the backend

```bash
pnpm dev:backend
# Runs on http://localhost:3000/api
# TypeORM will auto-create all tables on first boot (synchronize: true in dev)
```

### 5. Start the frontend

```bash
pnpm dev:frontend
# Runs on http://localhost:5173
# Vite proxies /api and /socket.io to :3000 automatically
```

### 6. Verify it works

- Open `http://localhost:5173/register` → create an account
- You should be redirected to `/dashboard`
- Try creating an agent — it will save to DB in `stopped` state
- Starting an agent will fail until open question #2 (OpenClaw gateway) is resolved

### Running everything in Docker (optional)

```bash
docker compose up --build
```

Note: the Docker setup mounts source dirs as volumes, so hot-reload works inside containers too.

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [User Journey (End-to-End)](#2-user-journey-end-to-end)
3. [How LLM Service Works](#3-how-llm-service-works)
4. [System Architecture](#4-system-architecture)
5. [Backend Module Breakdown](#5-backend-module-breakdown)
6. [Frontend Structure](#6-frontend-structure)
7. [Data Flow: Key Scenarios](#7-data-flow-key-scenarios)
8. [Database Entities](#8-database-entities)
9. [API Endpoints](#9-api-endpoints)
10. [Shared Types](#10-shared-types)
11. [API Key Management](#11-api-key-management)
12. [Deployment Overview](#12-deployment-overview)
13. [Channel Configuration Shapes](#13-channel-configuration-shapes)
14. [Scope Guard (v1)](#14-scope-guard-v1)

---

## 1. What We Are Building

A **web platform** where users:

1. Register and log in
2. Create AI agents — define the agent's identity and system prompt (SOUL.md)
3. Start their agent (flip status in DB — no child process)
4. **Talk to their agent directly in the browser** (web chat interface)
5. Connect agents to external channels (Telegram, Slack, WhatsApp, Discord)
6. Monitor activity and manage API keys

The backend handles all LLM interactions directly via @anthropic-ai/sdk and OpenAI SDK. No external runtime binary needed.

```
[ Browser (React SPA) ]                        [ Messaging Platforms ]
         |                                            |
         | REST + WebSocket                          | Webhooks
         v                                            v
[ NestJS Backend ]                            [ Channel Webhooks ]
         |                                     (Slack, Telegram,
    ┌────┴────┬───────────┐                    Discord, WhatsApp)
    v         v           v
[ LLM APIs ]  [ Channels ] [ Database ]
 (Anthropic,   (SDKs)      (PostgreSQL)
  OpenAI,
  OpenRouter,
  Ollama)
```

---

## 2. User Journey (End-to-End)

### New User Flow

```
1. User visits /register → fills email + password
2. Backend creates User + auto-creates their Workspace
3. User is redirected to /dashboard (empty state)
```

### Creating an Agent

```
1. User clicks "New Agent"
2. Fills form: name, model provider, model name, SOUL.md (agent identity)
3. POST /api/agents → backend saves Agent record in DB
4. No process spawned yet — agent is in 'stopped' state
```

### Starting and Using an Agent

```
1. User clicks "Start" on the agent card
2. POST /api/agents/:id/start →
   a. RuntimeService updates agent.status → 'running' in DB
   b. No child process spawned
3. User clicks "Chat" → opens /agents/:id/chat
4. User types a message:
   POST /api/agents/:id/chat  body: { message: "Hello" }
   → ChatService loads last 100 messages from chat_message table
   → Calls LLmService.chat() with messages, SOUL.md, provider, model
   → LLmService decrypts API key from api_key table
   → Routes to Anthropic/OpenAI/OpenRouter SDK
   → Returns response
   → Backend saves user message and reply to chat_message table
   → Response returned to frontend
5. User sees the response in a chat UI
6. To stop: User clicks "Stop" → agent.status → 'stopped'
```

### Monitoring

```
- /agents/:id/logs    → live log stream via WebSocket (stdout/stderr of the OpenClaw process)
- /agents/:id/memory  → read/edit MEMORY.md (what the agent remembers across sessions)
```

---

## 3. How LLM Service Works

LLmService is a NestJS injectable that wraps LLM provider SDKs. Every chat message follows this pipeline:

```
1. ChatService receives message from user
2. Loads agent config from DB (SOUL.md, modelProvider, modelName)
3. Loads last 100 chat messages from chat_message table (conversation context)
4. Calls LLmService.chat() with:
   - provider: 'claude' | 'openai' | 'openrouter' | 'ollama'
   - model: string (e.g., 'claude-sonnet-4-6', 'gpt-4o-mini')
   - systemPrompt: agent.soulMd (the agent's identity)
   - messages: { role, content }[] (chat history + new user message)
   - apiKeys: { ANTHROPIC_API_KEY, OPENAI_API_KEY, ... } (decrypted from DB)
5. LLmService routes to correct SDK:
   - Claude → @anthropic-ai/sdk (apiKey via ANTHROPIC_API_KEY env)
   - OpenAI/OpenRouter → openai SDK (apiKey + baseURL)
   - Ollama → openai SDK (baseURL: http://localhost:11434/v1)
6. SDK calls LLM API
7. Response returned to ChatService
8. ChatService saves user message + assistant reply to chat_message table
```

Agent config is DB-resident, not disk-resident:

| Column       | Purpose                       |
|--------------|-------------------------------|
| `soulMd`     | System prompt / agent identity |
| `toolsMd`    | Tools config (for future use) |
| `identityMd` | Display name, avatar          |
| `heartbeatMd`| Scheduled tasks (for future)  |

---

## 4. System Architecture

```
Browser (React SPA)
    |
    | HTTP REST  /api/*
    | WebSocket  /socket.io
    v
NestJS Backend (:3000)
    |-- AuthModule          JWT auth, guards
    |-- UsersModule         User CRUD, profile
    |-- WorkspacesModule    Workspace management (1:1 with user in v1)
    |-- AgentsModule        Agent CRUD + config management
    |-- RuntimeModule       Agent status flip (start/stop)
    |-- ChatModule          Message routing + history
    |-- LlmModule           LLM provider abstraction (@anthropic-ai/sdk, openai)
    |-- LogsModule          Activity logging + WebSocket
    |-- SkillsModule        Skill registry (future)
    |-- ApiKeysModule       Encrypted API key storage per workspace
    |-- SlackModule         Slack Events API webhook handler + signature verification
    |-- TelegramModule      Telegram webhook handler + bot token caching
    |-- DiscordModule       Discord persistent client + DM routing
    |-- WhatsappModule      WhatsApp Twilio webhook handler
    |
    |-- PostgreSQL (TypeORM)    agent config, chat history, api keys
    |-- Redis                   response caching
    |-- Bull Queue              async jobs (future: scheduled actions)
    |
    v
LLM APIs
    Anthropic (Claude)
    OpenAI (GPT)
    OpenRouter (router)
    Ollama (local)
```

---

## 5. Backend Module Breakdown

```
backend/src/
├── main.ts                     bootstrap, global pipes, CORS
├── app.module.ts               root module
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts      POST /auth/login, /auth/register, /auth/refresh
│   ├── auth.service.ts
│   ├── jwt.strategy.ts         Passport JWT strategy
│   └── jwt-auth.guard.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── user.entity.ts
│
├── workspaces/
│   ├── workspaces.module.ts
│   ├── workspaces.service.ts   auto-creates workspace on user register
│   └── workspace.entity.ts
│
├── agents/
│   ├── agents.module.ts
│   ├── agents.controller.ts
│   ├── agents.service.ts       CRUD + writes config files to disk
│   ├── agent.entity.ts
│   └── dto/
│       ├── create-agent.dto.ts
│       └── update-agent.dto.ts
│
├── runtime/
│   ├── runtime.module.ts
│   ├── runtime.service.ts      agent status flip (start/stop in DB)
│   └── (no child processes, no port pool)
│
├── llm/
│   ├── llm.module.ts
│   ├── llm.service.ts          routes to Anthropic/OpenAI/OpenRouter/Ollama
│   └── (provider abstraction + error handling)
│
├── chat/
│   ├── chat.module.ts
│   ├── chat.controller.ts      POST /agents/:id/chat
│   ├── chat.service.ts         calls LLmService inline, saves to DB
│   └── chat-message.entity.ts  persists chat history
│
├── logs/
│   ├── logs.module.ts
│   ├── logs.service.ts         persists activity logs to DB
│   ├── logs.gateway.ts         Socket.io WebSocket gateway for live streaming
│   └── log.entity.ts
│
├── skills/
│   ├── skills.module.ts
│   ├── skills.controller.ts
│   ├── skills.service.ts
│   └── skill.entity.ts
│
├── api-keys/
    ├── api-keys.module.ts
    ├── api-keys.controller.ts
    ├── api-keys.service.ts     encrypts/decrypts keys, injects into agent env at start
    └── api-key.entity.ts
│
├── slack/
    ├── slack.module.ts         imports AgentChannel + ChatModule (forwardRef)
    ├── slack.controller.ts      @Public() POST /webhooks/slack/events
    └── slack.service.ts         signature verification, message routing, WebClient.chat.postMessage
│
├── telegram/
    ├── telegram.module.ts
    ├── telegram.controller.ts    @Public() POST /webhooks/telegram/:token
    └── telegram.service.ts       bot token caching, node-telegram-bot-api integration
│
├── discord/
    ├── discord.module.ts
    ├── discord.controller.ts     @Public() POST /webhooks/discord/:botToken (init)
    └── discord.service.ts        persistent Discord.js client, DM channel listener
│
└── whatsapp/
    ├── whatsapp.module.ts
    ├── whatsapp.controller.ts    @Public() POST /webhooks/whatsapp
    └── whatsapp.service.ts       Twilio SDK integration, message sending
```

**Key NestJS packages:**

```
@nestjs/typeorm        ORM (PostgreSQL via pg)
@nestjs/jwt            JWT signing and verification
@nestjs/passport       auth guards
@nestjs/websockets     WebSocket gateway
@nestjs/bull           Bull queue integration
@nestjs/config         .env via ConfigService
socket.io              WebSocket transport
class-validator        DTO validation
class-transformer      DTO transformation
axios                  HTTP proxy calls to OpenClaw gateway
```

---

## 6. Frontend Structure

```
frontend/src/
├── main.tsx
├── App.tsx                 router setup, PrivateRoute wraps pages in Layout
├── index.css               @import "tailwindcss"; @theme { Inter font }
│
├── api/
│   ├── client.ts           axios instance, Bearer header, auto-refresh on 401
│   ├── agents.ts           agents CRUD + memory + lifecycle
│   ├── auth.ts             login, register, refresh
│   └── chat.ts             send message, load history
│
├── hooks/
│   ├── useAgents.ts        TanStack Query: list, get, create, update, start/stop
│   ├── useChat.ts          TanStack Query: history + optimistic send
│   └── useLiveLogs.ts      socket.io hook: subscribe-logs room, returns LogLine[]
│
├── pages/
│   ├── Login.tsx           glass card centered, ambient violet glow bg, eye toggle
│   ├── Register.tsx        same design as Login
│   ├── Dashboard.tsx       agent grid, skeleton loading, Bot empty state
│   ├── AgentNew.tsx        model preset buttons, custom model input, SOUL.md textarea
│   ├── AgentDetail.tsx     tabbed editor (SOUL/TOOLS/IDENTITY/HEARTBEAT), start/stop/chat/logs/memory actions in top bar, unsaved-changes footer
│   ├── AgentChat.tsx       AI Studio-style bubbles, typing dots, auto-resize textarea, agent-not-running banner
│   ├── AgentLogs.tsx       terminal viewer: line numbers, level colors, timestamp on hover
│   ├── AgentMemory.tsx     full-screen monospace editor, Save/Check button
│   └── Settings.tsx        provider selector buttons, password input, key list with delete
│
├── components/
│   ├── Layout.tsx          Sidebar + <main> wrapper
│   ├── Sidebar.tsx         Sparkles logo, NavLink items, logout — violet active state
│   ├── AgentCard.tsx       hover glow, Chat/Logs/Start-Stop actions
│   └── StatusBadge.tsx     colored dot: emerald/amber(pulse)/zinc/red per status
│
└── contexts/
    └── AuthContext.tsx     JWT in localStorage, currentUser, logout
```

**Design system summary:** zinc-950 base, `border-white/[0.08]` borders, violet-600 accent, Inter font, lucide-react icons. See ADR-014, ADR-015, ADR-016 in `architecture-decisions.md` for full rationale.

**Pages by route:**

```
/login
/register
/dashboard
/agents
/agents/new
/agents/:id            → AgentDetail (config editor)
/agents/:id/chat       → AgentChat   ← primary interaction surface
/agents/:id/logs       → AgentLogs
/agents/:id/memory     → AgentMemory
/settings
```

---

## 7. Data Flow: Key Scenarios

### Creating and Starting an Agent

```
1. User fills "New Agent" form → POST /api/agents
2. AgentsService creates Agent row in DB (status: 'stopped', soulMd, modelProvider, modelName)
3. User clicks Start → POST /api/agents/:id/start
4. RuntimeService updates agent.status → 'running' in DB (no process spawn)
5. Frontend polling GET /api/agents/:id → sees Running status
```

### Web Chat with an Agent

```
1. User opens /agents/:id/chat
2. Frontend loads chat history: GET /api/agents/:id/chat/history
3. User types a message → POST /api/agents/:id/chat  { message }
4. ChatService:
      a. Loads agent config from DB (soulMd, modelProvider, modelName)
      b. Loads last 100 messages from chat_message table
      c. Calls LLmService.chat() with:
         - systemPrompt: agent.soulMd
         - messages: [ ...history, { role: 'user', content: message } ]
         - provider & model from agent config
         - apiKeys (decrypted from api_key table)
      d. LLmService routes to correct SDK (Anthropic/OpenAI/OpenRouter/Ollama)
      e. Returns reply
      f. Saves ChatMessage row (role: 'user') and ChatMessage row (role: 'assistant')
5. Returns { reply: string } to frontend
6. Frontend appends both messages to the chat window
```

### Activity Logging

```
1. ChatService logs each chat request: workspace, provider, model, keys present
2. LLmService logs provider/model/message count for debugging
3. Logs persisted to agent_log table (manual entry, not streaming stdout)
4. LogsGateway.ts provides WebSocket streaming if needed in future
```

---

## 8. Database Entities

### User

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true })       email: string;
  @Column()                       passwordHash: string;
  @OneToOne(() => Workspace)      workspace: Workspace;
  @CreateDateColumn()             createdAt: Date;
}
```

### Workspace

```typescript
@Entity()
export class Workspace {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column()                       name: string;
  @OneToOne(() => User)           owner: User;
  @Column()                       diskPath: string;  // /workspaces/{id}/
  @CreateDateColumn()             createdAt: Date;
}
```

### Agent

```typescript
export type AgentStatus = 'stopped' | 'running' | 'error';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('uuid')   id: string;
  @ManyToOne(() => Workspace)       workspace: Workspace;
  @Column()                         name: string;
  @Column({ default: 'stopped' })   status: AgentStatus;  // logical state only
  @Column()                         modelProvider: string;  // 'claude' | 'openai' | 'openrouter' | 'ollama'
  @Column()                         modelName: string;

  // Config — stored in DB, never written to disk
  @Column({ type: 'text', default: '' })  soulMd: string;     // system prompt / agent identity
  @Column({ type: 'text', default: '' })  toolsMd: string;    // tool config (future)
  @Column({ type: 'text', default: '' })  identityMd: string; // display name, avatar
  @Column({ type: 'text', default: '' })  heartbeatMd: string;// scheduled tasks (future)

  @OneToMany(() => AgentChannel, (c) => c.agent, { cascade: true })
  channels: AgentChannel[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

### AgentChannel

```typescript
@Entity()
export class AgentChannel {
  @PrimaryGeneratedColumn('uuid')          id: string;
  @ManyToOne(() => Agent, { onDelete: 'CASCADE' }) agent: Agent;
  @Column()                                channelType: string;  // 'telegram' | 'slack' | 'discord'
  @Column({ type: 'jsonb', default: {} })  config: Record<string, string>;
  @Column({ default: true })               enabled: boolean;
}
```

### ChatMessage

```typescript
@Entity()
@Index(['agent', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')             id: string;
  @ManyToOne(() => Agent, { onDelete: 'CASCADE' }) agent: Agent;
  @Column()                                   role: 'user' | 'assistant';
  @Column({ type: 'text' })                   content: string;
  @CreateDateColumn()                         createdAt: Date;
}
```

### AgentLog

```typescript
@Entity()
@Index(['agent', 'timestamp'])
export class AgentLog {
  @PrimaryGeneratedColumn('uuid')             id: string;
  @ManyToOne(() => Agent, { onDelete: 'CASCADE' }) agent: Agent;
  @Column()                                   level: string;  // 'info' | 'error' | 'warn' | 'debug'
  @Column({ type: 'text' })                   message: string;
  @Column()                                   timestamp: Date;
}
```

### ApiKey

```typescript
@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')   id: string;
  @ManyToOne(() => Workspace)       workspace: Workspace;
  @Column()                         provider: string;     // 'anthropic' | 'openai'
  @Column()                         encryptedKey: string; // AES-256 encrypted at rest
  @CreateDateColumn()               createdAt: Date;
}
```

### Skill / AgentSkill

```typescript
@Entity()
export class Skill {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true })       name: string;
  @Column({ type: 'text' })       description: string;
  @Column({ type: 'text' })       soulMdSnippet: string; // injected into SOUL.md when enabled
  @Column({ default: true })      isBuiltin: boolean;
}

@Entity()
export class AgentSkill {
  @PrimaryGeneratedColumn('uuid')             id: string;
  @ManyToOne(() => Agent, { onDelete: 'CASCADE' }) agent: Agent;
  @ManyToOne(() => Skill)                     skill: Skill;
  @Column({ default: true })                  enabled: boolean;
}
```

---

## 9. API Endpoints

All routes prefixed `/api/`. Auth via `Authorization: Bearer <JWT>`.
Global guard applied — unauthenticated routes decorated `@Public()`.

**Security note:** Every agent/workspace lookup must verify the resource belongs to the
requesting user's workspace. Failing this is an IDOR vulnerability.

```
AUTH
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

AGENTS
GET    /api/agents                         list all agents in user's workspace
POST   /api/agents                         create agent
GET    /api/agents/:id                     get agent (all config fields)
PATCH  /api/agents/:id                     update agent config
DELETE /api/agents/:id                     delete + stop agent

AGENT LIFECYCLE  (queues a Bull job, returns 202)
POST   /api/agents/:id/start
POST   /api/agents/:id/stop
POST   /api/agents/:id/restart
GET    /api/agents/:id/status              { status, gatewayPort }

CHAT  ← core use case
POST   /api/agents/:id/chat                { message: string }  → { reply: string }
GET    /api/agents/:id/chat/history        paginated  ?page=1&limit=50

LOGS
GET    /api/agents/:id/logs                ?page&limit&level

WebSocket (socket.io on '/')
  emit  'subscribe-logs'    { agentId }
  emit  'unsubscribe-logs'  { agentId }
  on    'log-line'          { line, level, timestamp }

MEMORY
GET    /api/agents/:id/memory              reads MEMORY.md from disk
PUT    /api/agents/:id/memory              { content: string }  writes to disk

SKILLS
GET    /api/skills                         all available skills
GET    /api/agents/:id/skills              skills enabled for this agent
POST   /api/agents/:id/skills              { skillId }  enable skill
DELETE /api/agents/:id/skills/:sid         disable skill

CHANNELS
GET    /api/agents/:id/channels            list configured channels
POST   /api/agents/:id/channels            { channelType, config }  add channel
DELETE /api/agents/:id/channels/:cid       remove channel

WEBHOOKS (Messaging Platforms)
POST   /webhooks/slack/events              Slack Events API (url_verification + message)
POST   /webhooks/telegram/:token           Telegram bot webhook
POST   /webhooks/discord/:botToken         Discord init endpoint
POST   /webhooks/whatsapp                  WhatsApp (Twilio) webhook

API KEYS
GET    /api/api-keys                       list keys for workspace (names only, not values)
POST   /api/api-keys                       { provider, key }  stores encrypted
DELETE /api/api-keys/:id
```

---

## 10. Shared Types

```typescript
// shared/types.ts

export type AgentStatus    = 'stopped' | 'starting' | 'running' | 'error';
export type ModelProvider  = 'claude' | 'openai' | 'ollama';
export type ChannelType    = 'telegram' | 'slack' | 'discord' | 'whatsapp';
export type MessageRole    = 'user' | 'assistant';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  modelProvider: ModelProvider;
  modelName: string;
  gatewayPort: number | null;
  soulMd: string;
  toolsMd: string;
  identityMd: string;
  heartbeatMd: string;
  channels: AgentChannel[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface AgentChannel {
  id: string;
  channelType: ChannelType;
  config: Record<string, string>;
  enabled: boolean;
}

export interface LogLine {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
}

export interface CreateAgentDto {
  name: string;
  modelProvider: ModelProvider;
  modelName: string;
  soulMd?: string;
  toolsMd?: string;
}

export interface UpdateAgentDto extends Partial<CreateAgentDto> {
  identityMd?: string;
  heartbeatMd?: string;
}

export interface SendMessageDto {
  message: string;
}
```

---

## 11. API Key Management

Users must supply their LLM provider API keys (Anthropic, OpenAI, OpenRouter, etc.) in Settings.

**Storage:**
- Keys encrypted with AES-256-GCM before storing in the `api_key` table
- Encryption key comes from `API_KEY_ENCRYPTION_SECRET` env variable (must be in env, never committed)

**Usage:**
- On `POST /api/agents/:id/chat`: ChatService calls ApiKeysService.buildEnvForAgent(workspaceId)
- Returns object: `{ ANTHROPIC_API_KEY: decrypted, OPENAI_API_KEY: decrypted, ... }`
- Passed to LLmService — never logged or persisted

**GET /api/api-keys:** Returns provider + id only — never expose plaintext key.

**Workspace scope:** One set of API keys per workspace. All agents in a workspace share the same keys.

---

## 12. Deployment Overview

---

## 13. Channel Configuration Shapes (JSONB in AgentChannel.config)

```
VPS
├── Nginx             reverse proxy:
│                     /         → React build (static)
│                     /api/     → NestJS :3000
│                     /socket.io → NestJS :3000
├── NestJS (PM2)      backend + WebSocket gateway + Bull workers (single process for v1)
├── Redis             response caching (Bull queue for future background jobs)
└── PostgreSQL        agent config, chat history, api keys, activity logs
```

**Docker Compose (local dev):**

```yaml
services:
  backend:
    build: ./backend
    ports: ['3000:3000']
    depends_on: [postgres, redis]
    volumes:
      - ./workspaces:/workspaces
    environment:
      DATABASE_URL: postgres://myapp:secret@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
      JWT_SECRET: changeme
      API_KEY_ENCRYPTION_SECRET: changeme32chars!

  frontend:
    build: ./frontend
    ports: ['5173:5173']

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
```

---

## 13. Channel Configuration Shapes (JSONB in AgentChannel.config)

```typescript
// Slack
{ botToken: string, signingSecret: string, slackChannelId: string, teamId: string }

// Telegram
{ botToken: string, chatId: string }

// Discord
{ botToken: string, userId: string }

// WhatsApp (Twilio)
{ accountSid: string, authToken: string, phoneNumber: string }
```

---

## 14. Scope Guard (v1)

**In scope:**
- User registration, login, JWT auth
- One workspace per user (v1)
- Agent CRUD + config management (name, model, SOUL.md)
- Agent status flip (start/stop in DB)
- Web chat interface — inline LLM calls, DB-persisted history
- API key management (encrypted storage + decryption at request time)
- Support for Anthropic, OpenAI, OpenRouter, Ollama
- Activity logging to DB
- **Channel implementation:** Slack Events API, Telegram webhooks, Discord DMs, WhatsApp (Twilio) — all four working with message routing through ChatService

**Out of scope for v1:**
- Billing / subscriptions
- Multi-user workspaces (team members)
- Streaming chat responses (SSE/chunked)
- Long-running agent tasks (scheduled actions, background jobs) — Bull infrastructure ready but not implemented
- Mobile app
- Custom tool execution (shell, file system, browser automation)
- Channel enable/disable toggle (infrastructure ready, toggle UI future work)

When in doubt: if an endpoint isn't listed in Section 9, it's not in scope.

---

*End of design.md*
