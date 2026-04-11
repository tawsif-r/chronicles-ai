# design.md — My OpenClaw Wrapper App

> **Purpose:** Architecture reference for building a managed wrapper over OpenClaw,
> inspired by MyClaw's pattern. Written for human reading AND Claude Code context.
> Jump to any section by heading name.
>
> **Stack:** NestJS (backend) + React (frontend) + PostgreSQL (database)

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [How OpenClaw Works (The Thing We Wrap)](#2-how-openclaw-works-the-thing-we-wrap)
3. [What MyClaw Does Differently (The Pattern We Follow)](#3-what-myclaw-does-differently-the-pattern-we-follow)
4. [Our App Architecture](#4-our-app-architecture)
5. [Layer Breakdown](#5-layer-breakdown)
   - [5.1 Frontend (React)](#51-frontend-react)
   - [5.2 Backend (NestJS)](#52-backend-nestjs)
   - [5.3 OpenClaw Runtime Layer](#53-openclaw-runtime-layer)
   - [5.4 Database Layer](#54-database-layer)
6. [Data Flow: Request Lifecycle](#6-data-flow-request-lifecycle)
7. [Key TypeORM Entities](#7-key-typeorm-entities)
8. [Key API Endpoints](#8-key-api-endpoints)
9. [Shared Types (Backend and Frontend)](#9-shared-types-backend-and-frontend)
10. [React App Structure](#10-react-app-structure)
11. [Config Files and Agent Workspace](#11-config-files-and-agent-workspace)
12. [Deployment Overview](#12-deployment-overview)
13. [What We Are NOT Building (Scope Guard)](#13-what-we-are-not-building-scope-guard)

---

## 1. What We Are Building

We are building a **web-based management layer** on top of a self-hosted OpenClaw instance.

Think of it like this:

```
[ Our App ]  <---- users interact here (browser)
     |
     v
[ OpenClaw ]  <---- the actual AI agent engine (Node.js/TypeScript, running locally or on VPS)
     |
     v
[ LLM APIs / Tools / Channels ]  <---- Claude, GPT, shell, browser, Telegram, Slack, etc.
```

Our app does NOT replace OpenClaw. It wraps it — providing:
- A clean UI to configure and monitor agents
- User authentication and multi-tenant workspaces
- Deployment controls (start/stop/restart OpenClaw processes)
- Observability: live logs, usage, errors
- Skill/config management via web forms instead of editing raw files

**Why NestJS fits perfectly:**
- OpenClaw is TypeScript/Node — same ecosystem, no friction calling its APIs or managing its process
- NestJS has first-class WebSockets, making live log streaming straightforward
- TypeScript end-to-end means shared types between backend and frontend (no type drift)
- Bull queues for background jobs are much lighter than Python's Celery + separate worker setup

---

## 2. How OpenClaw Works (The Thing We Wrap)

Before building the wrapper, understand what OpenClaw is.

OpenClaw has three layers internally:

```
CHANNEL LAYER     -- receives messages from WhatsApp, Telegram, Slack, Discord
BRAIN LAYER       -- the agent runtime: resolves sessions, assembles context, calls LLM
BODY LAYER        -- tool execution: shell, file system, browser automation, MCP servers
```

It runs as a **single Gateway process** (Node.js/TypeScript).
Every message goes through this pipeline:

```
1. Message arrives (from channel)
2. Gateway assigns it to a session/lane
3. Agent runtime assembles context (MEMORY.md + chat history)
4. LLM is called (Claude, GPT, or local model)
5. LLM decides on a tool action (ReAct loop)
6. Tool executes (shell command, file read, browser action)
7. Result goes back to LLM
8. Final response sent back to channel
```

Key config files OpenClaw uses (stored on disk):
- `SOUL.md`      -- agent identity, instructions, personality
- `TOOLS.md`     -- what tools this agent can use
- `MEMORY.md`    -- persistent memory store (read/written by the agent at runtime)
- `IDENTITY.md`  -- personalization
- `HEARTBEAT.md` -- execution schedule / event loop config

OpenClaw binds its local HTTP gateway to `127.0.0.1:18789` by default.

**Our job:** Let users create and edit these files through a web UI,
and manage the OpenClaw process lifecycle (spawn, kill, watch logs).

---

## 3. What MyClaw Does Differently (The Pattern We Follow)

MyClaw is a **managed hosting product** for OpenClaw. Its key patterns:

| What MyClaw Does | Why It Matters |
|---|---|
| Abstracts raw OpenClaw config into forms | Non-technical users can configure agents |
| Manages the OpenClaw process (start/stop/restart) | No SSH needed |
| Provides a dashboard with logs and health status | Observability without terminal access |
| Handles user accounts and workspaces | Multi-user / multi-agent support |
| Handles infrastructure (VPS provisioning) | Zero-config deployment |

We borrow the **product pattern** (forms, dashboard, process management)
but we are NOT building the infrastructure provisioning layer.
Our app assumes OpenClaw is already installed on a known host.

---

## 4. Our App Architecture

High-level diagram:

```
Browser (React SPA)
    |
    | HTTP / WebSocket
    v
NestJS Backend
    |-- REST API (controllers)      -- CRUD for agents, workspaces, users
    |-- WebSocket Gateway           -- live log streaming via Socket.io
    |-- Bull Queue (workers)        -- async tasks: deploy, restart, health checks
    +-- OpenClaw Manager (service)  -- spawns/kills OpenClaw process, tails logs
            |
            v
        OpenClaw Process (same host or remote VPS)
        (communicates via child_process spawn + local HTTP at :18789)
            |
            v
        LLM APIs + Messaging Channels + Tools
```

---

## 5. Layer Breakdown

### 5.1 Frontend (React)

**What it does:** Provides the entire user interface.

Pages and their purpose:

```
/login                -- authentication
/dashboard            -- overview: agents, health, recent activity
/agents               -- list all agents
/agents/new           -- create a new agent (fills SOUL.md, TOOLS.md, etc.)
/agents/:id           -- view/edit one agent's config
/agents/:id/logs      -- live log stream for that agent (WebSocket)
/agents/:id/memory    -- view/edit MEMORY.md for that agent
/settings             -- API keys, model selection
```

Key React patterns:
- TanStack Query (react-query v5) for data fetching and cache
- `socket.io-client` for live log streaming
- Controlled forms for agent config (SOUL.md as textarea, TOOLS.md as checkboxes)
- React Context for auth state (JWT storage)

### 5.2 Backend (NestJS)

**What it does:** Serves the API, manages the database, controls the OpenClaw process.

NestJS module structure:

```
backend/
+-- src/
    |-- main.ts                    -- bootstrap, global pipes, CORS
    |-- app.module.ts              -- root module, imports all feature modules
    |
    |-- auth/                      -- JWT auth, guards, login/register
    |   |-- auth.module.ts
    |   |-- auth.controller.ts
    |   |-- auth.service.ts
    |   |-- jwt.strategy.ts        -- Passport JWT strategy
    |   +-- jwt-auth.guard.ts      -- applied globally or per-route
    |
    |-- users/                     -- User entity, profile management
    |   |-- users.module.ts
    |   |-- users.controller.ts
    |   |-- users.service.ts
    |   +-- user.entity.ts
    |
    |-- workspaces/                -- Workspace entity, membership
    |   |-- workspaces.module.ts
    |   |-- workspaces.controller.ts
    |   |-- workspaces.service.ts
    |   +-- workspace.entity.ts
    |
    |-- agents/                    -- Core feature: agent CRUD + config management
    |   |-- agents.module.ts
    |   |-- agents.controller.ts
    |   |-- agents.service.ts      -- business logic, config file writes
    |   |-- agent.entity.ts
    |   +-- dto/
    |       |-- create-agent.dto.ts
    |       +-- update-agent.dto.ts
    |
    |-- runtime/                   -- OpenClaw process management
    |   |-- runtime.module.ts
    |   |-- runtime.service.ts     -- start/stop/restart/status via child_process
    |   +-- runtime.processor.ts  -- Bull queue processor for async deploy tasks
    |
    |-- logs/                      -- Log ingestion + WebSocket streaming
    |   |-- logs.module.ts
    |   |-- logs.service.ts        -- ingests lines from child_process, persists to DB
    |   |-- logs.gateway.ts        -- Socket.io WebSocket gateway
    |   +-- log.entity.ts
    |
    +-- skills/                    -- Skill registry per agent
        |-- skills.module.ts
        |-- skills.controller.ts
        |-- skills.service.ts
        +-- skill.entity.ts
```

**Key NestJS packages used:**

```
@nestjs/typeorm          -- ORM integration (PostgreSQL via pg driver)
@nestjs/jwt              -- JWT signing and verification
@nestjs/passport         -- auth guards
@nestjs/websockets       -- WebSocket gateway decorator support
@nestjs/bull             -- Bull queue for background jobs
@nestjs/config           -- .env config via ConfigService
socket.io                -- WebSocket transport (used by logs.gateway.ts)
class-validator          -- DTO validation via decorators
class-transformer        -- DTO transformation
```

### 5.3 OpenClaw Runtime Layer

**What it does:** Manages the actual OpenClaw process.

This lives entirely in `src/runtime/runtime.service.ts`.
Because NestJS is Node.js, we use Node's built-in `child_process` module directly —
no subprocess wrappers, no shelling out from another language.

```typescript
// src/runtime/runtime.service.ts -- simplified sketch

import { Injectable } from '@nestjs/common';
import { ChildProcess, spawn } from 'child_process';

@Injectable()
export class RuntimeService {
  // Map of agentId -> running child process
  private processes = new Map<string, ChildProcess>();

  async start(agentId: string, workspacePath: string): Promise<void> {
    // AgentsService writes config files to disk before calling this
    const proc = spawn('pnpm', ['start'], {
      cwd: workspacePath,   // the agent's directory with SOUL.md etc.
      env: { ...process.env },
    });

    this.processes.set(agentId, proc);

    // Pipe stdout/stderr into our log system
    proc.stdout.on('data', (chunk) => this.logsService.ingest(agentId, chunk));
    proc.stderr.on('data', (chunk) => this.logsService.ingest(agentId, chunk));
    proc.on('exit', (code) => this.handleExit(agentId, code));
  }

  stop(agentId: string): void {
    this.processes.get(agentId)?.kill('SIGTERM');
    this.processes.delete(agentId);
  }

  async restart(agentId: string, workspacePath: string): Promise<void> {
    this.stop(agentId);
    await this.start(agentId, workspacePath);
  }

  status(agentId: string): 'running' | 'stopped' {
    return this.processes.has(agentId) ? 'running' : 'stopped';
  }
}
```

Each log line ingested by `LogsService` is:
1. Persisted to the `agent_log` table in PostgreSQL
2. Emitted immediately to the Socket.io room for that agent (live streaming)

### 5.4 Database Layer

**What it stores:** Users, workspaces, agents, channels, skills, logs.

Uses PostgreSQL with TypeORM. Entities are defined in Section 7.
Migrations managed via TypeORM CLI (`typeorm migration:generate`).

---

## 6. Data Flow: Request Lifecycle

### Creating and Deploying an Agent

```
1.  User fills the "New Agent" form in React
2.  React POSTs to: POST /api/agents
3.  NestJS AgentsController receives request, validates DTO
4.  AgentsService creates Agent record in PostgreSQL
5.  AgentsService writes config files to disk:
        /workspaces/{workspaceId}/agents/{agentId}/SOUL.md
        /workspaces/{workspaceId}/agents/{agentId}/TOOLS.md
        ... etc.
6.  POST /api/agents/:id/start  ->  adds job to Bull queue
7.  Bull worker (runtime.processor.ts) picks up the job
8.  RuntimeService.start(agentId) spawns OpenClaw child process
9.  AgentsService updates agent.status = 'running' in DB
10. React polls GET /api/agents/:id  ->  shows "Running" badge
```

### Viewing Live Logs

```
1. User opens /agents/:id/logs in browser
2. React connects socket.io client to: ws://ourapp.com/
3. React emits: socket.emit('subscribe-logs', { agentId })
4. logs.gateway.ts joins the socket to that agent's room
5. RuntimeService already has stdout/stderr piped from the child_process
6. Each log line is broadcast: server.to(agentId).emit('log-line', { line, level, ts })
7. React appends lines to the log viewer in real time
```

---

## 7. Key TypeORM Entities

```typescript
// src/users/user.entity.ts
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @ManyToOne(() => Workspace, { nullable: true })
  workspace: Workspace;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// src/workspaces/workspace.entity.ts
@Entity()
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User)
  owner: User;

  @Column()
  diskPath: string;   // absolute path on server: /workspaces/{id}/

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// src/agents/agent.entity.ts
export type AgentStatus = 'stopped' | 'running' | 'error' | 'deploying';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { eager: true })
  workspace: Workspace;

  @Column()
  name: string;

  @Column({ default: 'stopped' })
  status: AgentStatus;

  @Column()
  modelProvider: string;   // 'claude' | 'openai' | 'ollama'

  @Column()
  modelName: string;       // e.g. 'claude-sonnet-4-20250514'

  // Config file contents -- DB is source of truth, written to disk on deploy
  @Column({ type: 'text', default: '' })
  soulMd: string;

  @Column({ type: 'text', default: '' })
  toolsMd: string;

  @Column({ type: 'text', default: '' })
  memoryMd: string;        // synced FROM disk after agent runs (see Section 11)

  @Column({ type: 'text', default: '' })
  identityMd: string;

  @Column({ type: 'text', default: '' })
  heartbeatMd: string;

  @OneToMany(() => AgentChannel, (c) => c.agent, { cascade: true })
  channels: AgentChannel[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// src/agents/agent-channel.entity.ts
@Entity()
export class AgentChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (a) => a.channels, { onDelete: 'CASCADE' })
  agent: Agent;

  @Column()
  channelType: string;   // 'telegram' | 'slack' | 'discord' | 'whatsapp'

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, string>;   // bot token, channel ID, webhook URL, etc.

  @Column({ default: true })
  enabled: boolean;
}
```

```typescript
// src/logs/log.entity.ts
@Entity()
@Index(['agent', 'timestamp'])
export class AgentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  agent: Agent;

  @Column()
  level: string;   // 'info' | 'error' | 'debug' | 'warn'

  @Column({ type: 'text' })
  message: string;

  @Column()
  timestamp: Date;
}
```

```typescript
// src/skills/skill.entity.ts
@Entity()
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  soulMdSnippet: string;   // injected into agent's SOUL.md when skill is enabled

  @Column({ default: true })
  isBuiltin: boolean;
}

@Entity()
export class AgentSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  agent: Agent;

  @ManyToOne(() => Skill)
  skill: Skill;

  @Column({ default: true })
  enabled: boolean;
}
```

---

## 8. Key API Endpoints

All endpoints prefixed `/api/`. Auth via JWT Bearer token.
Guards applied globally — unauthenticated routes marked `@Public()`.

```
AUTH
POST   /api/auth/register              -- create account, returns JWT
POST   /api/auth/login                 -- returns JWT tokens
POST   /api/auth/refresh               -- refresh access token

AGENTS
GET    /api/agents                     -- list all agents in current workspace
POST   /api/agents                     -- create new agent
GET    /api/agents/:id                 -- get one agent (includes all config fields)
PATCH  /api/agents/:id                 -- update agent config (any field)
DELETE /api/agents/:id                 -- delete agent and stop its process

AGENT ACTIONS  (queue a Bull job, return 202 Accepted)
POST   /api/agents/:id/start           -- write configs to disk, spawn OpenClaw
POST   /api/agents/:id/stop            -- kill OpenClaw process
POST   /api/agents/:id/restart         -- stop + start
GET    /api/agents/:id/status          -- { status: 'running' | 'stopped' | 'error' }

LOGS
GET    /api/agents/:id/logs            -- paginated log history from DB
                                          query params: ?page=1&limit=100&level=error

WebSocket (socket.io on '/')
  emit  'subscribe-logs'   { agentId } -- start receiving log lines
  emit  'unsubscribe-logs' { agentId } -- stop
  on    'log-line'  { line, level, timestamp } -- incoming live log line

MEMORY
GET    /api/agents/:id/memory          -- read MEMORY.md from disk
PUT    /api/agents/:id/memory          -- write MEMORY.md to disk + sync to DB
                                          body: { content: string }

SKILLS
GET    /api/skills                     -- list all available skills
GET    /api/agents/:id/skills          -- skills enabled for this agent
POST   /api/agents/:id/skills          -- enable a skill  body: { skillId }
DELETE /api/agents/:id/skills/:sid     -- disable a skill

CHANNELS
GET    /api/agents/:id/channels        -- list connected channels
POST   /api/agents/:id/channels        -- add a channel  body: { channelType, config }
PATCH  /api/agents/:id/channels/:cid   -- update channel config
DELETE /api/agents/:id/channels/:cid   -- remove a channel
```

---

## 9. Shared Types (Backend and Frontend)

One of the main advantages of full TypeScript is a shared types package.
Put shared interfaces in a `packages/shared/` directory (if monorepo)
or a simple `shared/types.ts` file imported by both sides.

```typescript
// shared/types.ts

export type AgentStatus = 'stopped' | 'running' | 'error' | 'deploying';

export type ModelProvider = 'claude' | 'openai' | 'ollama';

export type ChannelType = 'telegram' | 'slack' | 'discord' | 'whatsapp';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  modelProvider: ModelProvider;
  modelName: string;
  soulMd: string;
  toolsMd: string;
  memoryMd: string;
  identityMd: string;
  heartbeatMd: string;
  channels: AgentChannel[];
  createdAt: string;
  updatedAt: string;
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

// DTOs used for API request bodies
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
```

---

## 10. React App Structure

```
frontend/
+-- src/
    |-- main.tsx               -- app entry point
    |-- App.tsx                -- router setup (react-router-dom v6)
    |-- shared/
    |   +-- types.ts           -- import from shared/types.ts or copy here
    |-- api/
    |   |-- client.ts          -- axios instance, JWT interceptor, base URL
    |   |-- agents.ts          -- agent CRUD API calls
    |   |-- auth.ts            -- login/register calls
    |   +-- logs.ts            -- paginated log fetch
    |-- hooks/
    |   |-- useAuth.ts         -- auth state from context
    |   |-- useAgents.ts       -- TanStack Query wrapper for agent list/detail
    |   +-- useLiveLogs.ts     -- socket.io hook: subscribes to agent's log room
    |-- pages/
    |   |-- Login.tsx
    |   |-- Dashboard.tsx
    |   |-- AgentList.tsx
    |   |-- AgentDetail.tsx    -- view + edit all config fields
    |   |-- AgentLogs.tsx      -- live log viewer (uses useLiveLogs hook)
    |   |-- AgentMemory.tsx    -- read/write MEMORY.md
    |   +-- Settings.tsx
    |-- components/
    |   |-- AgentCard.tsx      -- name, status badge, start/stop button
    |   |-- StatusBadge.tsx    -- 'Running' / 'Stopped' / 'Error' pill
    |   |-- LogViewer.tsx      -- scrollable terminal-style log UI
    |   |-- ConfigEditor.tsx   -- textarea for SOUL.md, TOOLS.md, etc.
    |   +-- ChannelConfig.tsx  -- form to connect Telegram/Slack/etc.
    +-- contexts/
        +-- AuthContext.tsx    -- JWT storage, current user, workspace
```

---

## 11. Config Files and Agent Workspace

Each agent gets its own directory on the server:

```
/workspaces/
+-- {workspaceId}/
    +-- agents/
        +-- {agentId}/
            |-- SOUL.md         <- agent identity and instructions
            |-- TOOLS.md        <- which tools are enabled
            |-- MEMORY.md       <- persistent memory (written by OpenClaw at runtime)
            |-- IDENTITY.md     <- personalization (name, avatar text)
            +-- HEARTBEAT.md    <- scheduled tasks / event loop config
```

**Source of truth rule:**
The database (`soulMd`, `toolsMd` etc. columns on Agent entity) is the source of truth
for all config EXCEPT `memoryMd`. When an agent starts, `AgentsService` writes DB
fields out to disk before spawning the process. Never edit config files directly —
always go through the API.

`memoryMd` is the exception — OpenClaw writes to `MEMORY.md` at runtime.
The Memory page reads it from disk via `GET /api/agents/:id/memory`.
When the user edits and saves it, `PUT /api/agents/:id/memory` writes back to disk
and syncs the new value into the DB column.

---

## 12. Deployment Overview

Single VPS deployment (initial version):

```
VPS
|-- Nginx                    -- reverse proxy:
|                               serves React build at /
|                               proxies /api/      -> NestJS :3000
|                               proxies /socket.io -> NestJS :3000
|-- NestJS (PM2)             -- our backend + WebSocket gateway + Bull workers
|                               (all in one process -- no separate worker dyno needed for v1)
|-- Redis                    -- Bull queue broker (single lightweight instance)
|-- PostgreSQL               -- primary database
+-- OpenClaw process(es)     -- spawned as child processes by RuntimeService
```

**Why no separate worker process?**
NestJS runs Bull processors in the same process by default. Fine for v1.
If load requires it later, `runtime.processor.ts` can be extracted to its own dyno.

Docker Compose for local development:

```yaml
# docker-compose.yml (simplified)
services:
  backend:
    build: ./backend
    ports: ['3000:3000']
    depends_on: [postgres, redis]
    volumes:
      - ./workspaces:/workspaces   # agent config + log files live here

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

## 13. What We Are NOT Building (Scope Guard)

This section keeps scope under control. Do NOT implement these in v1:

- **VPS provisioning** -- MyClaw does this; we assume OpenClaw is already installed
- **Billing / subscription management** -- out of scope
- **Multi-region or distributed OpenClaw** -- one host per workspace is enough
- **Custom LLM provider adapters** -- pass the API key through to OpenClaw's config
- **Mobile app** -- responsive web is sufficient
- **Fine-tuning or model training** -- not relevant here
- **Separate Bull worker dyno** -- single NestJS process handles it for now

When in doubt: if it is not in the endpoint list in Section 8, it is not in scope.

---

*End of design.md -- last updated April 2026*