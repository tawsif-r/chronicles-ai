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
| Agents CRUD + config file writes | `backend/src/agents/` | Done |
| Runtime (spawn/kill/restart, port pool) | `backend/src/runtime/` | Done — see open question #2 before testing |
| Chat (proxy to OpenClaw gateway) | `backend/src/chat/` | Done — **blocked on open question #2** |
| Logs (persist + Socket.io stream) | `backend/src/logs/` | Done |
| API Keys (AES-256-GCM encrypt/decrypt) | `backend/src/api-keys/` | Done |
| Skills registry | `backend/src/skills/` | Done |
| Frontend routing + AuthContext | `frontend/src/App.tsx`, `contexts/` | Done |
| Frontend API client + hooks | `frontend/src/api/`, `hooks/` | Done |
| All pages (Login→Chat→Logs→Memory) | `frontend/src/pages/` | Done — unstyled stubs |

**Current state (April 2026):** App boots and is fully functional up to the OpenClaw boundary. Register, login, create agents, and manage API keys all work. Starting an agent will succeed if `openclaw` is in PATH; chat will work once open question #2 is resolved.

**Next:** Verify OpenClaw gateway contract (open question #2), then wire up chat end-to-end.

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
3. [How OpenClaw Works](#3-how-openclaw-works)
4. [System Architecture](#4-system-architecture)
5. [Backend Module Breakdown](#5-backend-module-breakdown)
6. [Frontend Structure](#6-frontend-structure)
7. [Data Flow: Key Scenarios](#7-data-flow-key-scenarios)
8. [Database Entities](#8-database-entities)
9. [API Endpoints](#9-api-endpoints)
10. [Shared Types](#10-shared-types)
11. [Agent Workspace on Disk](#11-agent-workspace-on-disk)
12. [OpenClaw Port Management](#12-openclaw-port-management)
13. [API Key Management](#13-api-key-management)
14. [Deployment Overview](#14-deployment-overview)
15. [Scope Guard (v1)](#15-scope-guard-v1)

---

## 1. What We Are Building

A **web platform** where users:

1. Register and log in
2. Create AI agents — define the agent's identity, tools, and model
3. Start their agent (we manage the process lifecycle)
4. **Talk to their agent directly in the browser** (web chat interface)
5. Optionally connect agents to external channels (Telegram, Slack, etc.)
6. Monitor logs, inspect and edit agent memory, view activity

The underlying runtime engine is **OpenClaw** — a self-hosted AI agent framework that handles the LLM loop, tool execution, memory, and channel integrations. We wrap it with auth, multi-tenancy, a database, and a proper web UI.

```
[ Browser (React SPA) ]
         |
         | REST + WebSocket
         v
[ NestJS Backend ]
         |
         | child_process spawn (per agent)
         v
[ OpenClaw Process ]  <-- one per running agent, on its own port
         |
         v
[ LLM APIs · Tools · External Channels ]
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
   a. AgentsService writes config files to disk (SOUL.md, TOOLS.md, etc.)
   b. RuntimeService picks a free port from the pool (18800–19800)
   c. Saves the port to agent.gatewayPort in DB
   d. Spawns: `openclaw start --port {gatewayPort}` as a child process
   e. Agent status → 'running'
3. User clicks "Chat" → opens /agents/:id/chat
4. User types a message:
   POST /api/agents/:id/chat  body: { message: "Hello" }
   → Backend proxies the message to OpenClaw at 127.0.0.1:{gatewayPort}
   → OpenClaw runs the LLM loop, returns the response
   → Backend saves the exchange to chat_message table
   → Response returned to frontend
5. User sees the response in a chat UI
```

### Monitoring

```
- /agents/:id/logs    → live log stream via WebSocket (stdout/stderr of the OpenClaw process)
- /agents/:id/memory  → read/edit MEMORY.md (what the agent remembers across sessions)
```

---

## 3. How OpenClaw Works

OpenClaw is a Node.js/TypeScript AI agent runtime. Three internal layers:

```
CHANNEL LAYER  -- receives messages from WhatsApp, Telegram, Slack, Discord, HTTP
BRAIN LAYER    -- agent runtime: resolves sessions, assembles context, calls LLM
BODY LAYER     -- tool execution: shell, file system, browser automation, MCP servers
```

Every message follows this pipeline:

```
1. Message arrives (from channel or HTTP gateway)
2. Gateway assigns it to a session/lane
3. Agent runtime assembles context (MEMORY.md + chat history)
4. LLM is called (Claude, GPT, or local model)
5. LLM decides on a tool action (ReAct loop)
6. Tool executes (shell command, file read, browser action)
7. Result goes back to LLM
8. Final response sent back to caller
```

OpenClaw reads config from disk at startup:

| File           | Purpose                                      |
|----------------|----------------------------------------------|
| `SOUL.md`      | Agent identity, instructions, personality    |
| `TOOLS.md`     | Which tools this agent can use               |
| `MEMORY.md`    | Persistent memory (written by agent at runtime) |
| `IDENTITY.md`  | Display name, avatar text                    |
| `HEARTBEAT.md` | Scheduled tasks / event loop config          |

By default OpenClaw binds its HTTP gateway to `127.0.0.1:18789`.
**We override this port per agent** — see Section 12.

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
    |-- WorkspacesModule    Workspace management, membership
    |-- AgentsModule        Agent CRUD, config file management
    |-- RuntimeModule       OpenClaw process lifecycle (spawn/kill/restart)
    |-- ChatModule          Proxy messages to/from OpenClaw HTTP gateway
    |-- LogsModule          Log ingestion + WebSocket streaming
    |-- SkillsModule        Skill registry
    |-- ApiKeysModule       Encrypted API key storage per workspace
    |
    |-- PostgreSQL (TypeORM)     persistent state
    |-- Redis                    Bull queue broker + response caching
    |-- Bull Queue               async jobs: deploy, restart, health checks
    |
    v (child_process per agent)
OpenClaw Process A  (:18801)
OpenClaw Process B  (:18802)
OpenClaw Process C  (:18803)
    |
    v
LLM APIs + Messaging Channels + Tools
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
│   ├── runtime.service.ts      spawn/kill/restart OpenClaw per agent
│   │                           manages port pool (18800–19800)
│   └── runtime.processor.ts   Bull queue processor for deploy jobs
│
├── chat/
│   ├── chat.module.ts
│   ├── chat.controller.ts      POST /agents/:id/chat
│   ├── chat.service.ts         proxies message to OpenClaw gateway at agent's port
│   └── chat-message.entity.ts  persists chat history
│
├── logs/
│   ├── logs.module.ts
│   ├── logs.service.ts         ingests stdout/stderr from child_process
│   ├── logs.gateway.ts         Socket.io WebSocket gateway for live streaming
│   └── log.entity.ts
│
├── skills/
│   ├── skills.module.ts
│   ├── skills.controller.ts
│   ├── skills.service.ts
│   └── skill.entity.ts
│
└── api-keys/
    ├── api-keys.module.ts
    ├── api-keys.controller.ts
    ├── api-keys.service.ts     encrypts/decrypts keys, injects into agent env at start
    └── api-key.entity.ts
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
├── App.tsx                 router setup (react-router-dom v6)
├── shared/
│   └── types.ts            mirrors backend shared types
├── api/
│   ├── client.ts           axios instance, JWT interceptor
│   ├── agents.ts
│   ├── auth.ts
│   ├── chat.ts
│   └── logs.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useAgents.ts        TanStack Query wrappers
│   ├── useChat.ts          send message, load history
│   └── useLiveLogs.ts      socket.io hook
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx       agent cards, health overview
│   ├── AgentList.tsx
│   ├── AgentNew.tsx        create agent form
│   ├── AgentDetail.tsx     view + edit config
│   ├── AgentChat.tsx       ← core use case: chat with agent in browser
│   ├── AgentLogs.tsx       live log viewer
│   ├── AgentMemory.tsx     read/write MEMORY.md
│   └── Settings.tsx        API keys, model selection
├── components/
│   ├── AgentCard.tsx       name, status badge, start/stop/chat buttons
│   ├── StatusBadge.tsx
│   ├── ChatWindow.tsx      message list + input box
│   ├── LogViewer.tsx       scrollable terminal-style
│   ├── ConfigEditor.tsx    textarea for SOUL.md, TOOLS.md etc.
│   └── ChannelConfig.tsx
└── contexts/
    └── AuthContext.tsx     JWT storage, current user, workspace
```

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
1.  User fills "New Agent" form → POST /api/agents
2.  AgentsService creates Agent row in DB (status: 'stopped')
3.  User clicks Start → POST /api/agents/:id/start
4.  Bull queue job enqueued
5.  runtime.processor picks up job:
      a. AgentsService writes config files to disk
      b. RuntimeService finds a free port (see Section 12)
      c. Saves port to agent.gatewayPort
      d. Spawns: spawn('openclaw', ['start', '--port', gatewayPort], { cwd: agentDir })
      e. Pipes stdout/stderr into LogsService
6.  Agent status updated to 'running' in DB
7.  Frontend polls GET /api/agents/:id → shows Running badge
```

### Web Chat with an Agent

```
1. User opens /agents/:id/chat
2. Frontend loads chat history: GET /api/agents/:id/chat/history
3. User types a message → POST /api/agents/:id/chat  { message }
4. ChatService:
      a. Checks agent status is 'running', has a gatewayPort
      b. HTTP POST to http://127.0.0.1:{gatewayPort}/message  { content: message }
      c. Waits for OpenClaw response (synchronous for v1, streaming later)
      d. Saves ChatMessage row (role: 'user') and ChatMessage row (role: 'assistant')
5. Returns { reply: string } to frontend
6. Frontend appends both messages to the chat window
```

### Live Log Streaming

```
1. User opens /agents/:id/logs
2. React connects socket.io: ws://app.com/
3. Emits 'subscribe-logs' { agentId }
4. logs.gateway.ts adds socket to room agentId
5. Each stdout/stderr line from child_process:
      → LogsService persists to agent_log table
      → server.to(agentId).emit('log-line', { line, level, ts })
6. React appends lines in real time
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
export type AgentStatus = 'stopped' | 'starting' | 'running' | 'error';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('uuid')   id: string;
  @ManyToOne(() => Workspace)       workspace: Workspace;
  @Column()                         name: string;
  @Column({ default: 'stopped' })   status: AgentStatus;
  @Column()                         modelProvider: string;  // 'claude' | 'openai' | 'ollama'
  @Column()                         modelName: string;

  // Dynamic port assigned at start time, null when stopped
  @Column({ nullable: true })       gatewayPort: number | null;

  // Config file contents — DB is source of truth, written to disk at start
  @Column({ type: 'text', default: '' })  soulMd: string;
  @Column({ type: 'text', default: '' })  toolsMd: string;
  @Column({ type: 'text', default: '' })  identityMd: string;
  @Column({ type: 'text', default: '' })  heartbeatMd: string;

  // memoryMd is NOT stored in DB — read/written directly from disk
  // (OpenClaw writes to MEMORY.md at runtime)

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
GET    /api/agents/:id/channels
POST   /api/agents/:id/channels            { channelType, config }
PATCH  /api/agents/:id/channels/:cid
DELETE /api/agents/:id/channels/:cid

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

## 11. Agent Workspace on Disk

Each agent gets its own directory:

```
/workspaces/
└── {workspaceId}/
    └── agents/
        └── {agentId}/
            ├── SOUL.md          agent identity and instructions
            ├── TOOLS.md         which tools are enabled
            ├── MEMORY.md        persistent memory (written by OpenClaw at runtime)
            ├── IDENTITY.md      display name, avatar text
            └── HEARTBEAT.md     scheduled tasks / event loop config
```

**Source of truth:**
- DB is source of truth for all config fields EXCEPT `MEMORY.md`
- On `start`: AgentsService writes DB fields → disk files, then RuntimeService spawns
- On `stop`: no files are deleted (preserve memory and logs)
- `MEMORY.md` is owned by OpenClaw at runtime — always read from disk, never cache in DB

---

## 12. OpenClaw Port Management

**Problem:** OpenClaw binds to a port at startup. Multiple agents can't share `:18789`.

**Solution:** Dynamic port pool managed by RuntimeService.

- Port range: `18800–19800` (1000 slots = 1000 concurrent agents max per server, sufficient for v1)
- RuntimeService maintains a `Set<number>` of in-use ports in memory
- On `start(agentId)`:
  1. Iterate range to find a port not in the in-use set
  2. Save port to `agent.gatewayPort` in DB
  3. Add port to in-use set
  4. Spawn: `openclaw start --port {port}` in agent's workspace directory
- On `stop(agentId)`:
  1. Kill process
  2. Remove port from in-use set
  3. Set `agent.gatewayPort = null` in DB
- On backend restart: query DB for all `status = 'running'` agents to rebuild the in-use set
  (or mark them all as 'error' and require manual restart — simpler for v1)

---

## 13. API Key Management

Users must supply their LLM provider API keys (Anthropic, OpenAI, etc.).

**Storage:**
- Keys encrypted with AES-256-GCM before storing in the `api_key` table
- Encryption key comes from `API_KEY_ENCRYPTION_SECRET` env variable
- On `GET /api/api-keys`: return provider + id only — never return plaintext key
- On agent start: ApiKeysService decrypts the relevant key, injects it into the spawned process env:
  ```
  env: { ...process.env, ANTHROPIC_API_KEY: decryptedKey }
  ```

**Workspace scope:** One set of API keys per workspace. All agents in a workspace share the same keys.

---

## 14. Deployment Overview

```
VPS
├── Nginx             reverse proxy:
│                     /         → React build (static)
│                     /api/     → NestJS :3000
│                     /socket.io → NestJS :3000
├── NestJS (PM2)      backend + WebSocket gateway + Bull workers (single process for v1)
├── Redis             Bull queue broker
├── PostgreSQL        primary database
└── OpenClaw processes  spawned as child processes by RuntimeService
                        each on its own port (18800–19800)
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

## 15. Scope Guard (v1)

**In scope:**
- User registration, login, JWT auth
- Workspace per user (one workspace per user for v1)
- Agent CRUD + config management via web forms
- Agent process lifecycle (start/stop/restart)
- Web chat interface with agents
- Live log streaming (WebSocket)
- MEMORY.md view/edit
- API key management (encrypted storage)
- Channel config (Telegram/Slack token storage) — stored but channels are configured via OpenClaw
- Skills registry

**Out of scope for v1:**
- VPS provisioning (assume OpenClaw is already installed on the host)
- Billing / subscriptions
- Multi-user workspaces (inviting team members)
- Streaming chat responses (SSE/chunked) — start with request/response
- Custom LLM provider adapters (pass API key through to OpenClaw)
- Mobile app
- Separate Bull worker dyno (single NestJS process is enough for v1)
- RabbitMQ (Bull + Redis is sufficient; RabbitMQ only if load requires multi-worker pub/sub)

When in doubt: if an endpoint isn't listed in Section 9, it's not in scope.

---

*End of design.md*
