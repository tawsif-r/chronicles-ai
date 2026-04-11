# design.md — My OpenClaw Wrapper App

> **Purpose:** Architecture reference for building a managed wrapper over OpenClaw,
> inspired by MyClaw's pattern. Written for human reading AND Claude Code context.
> Jump to any section by heading name.

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [How OpenClaw Works (The Thing We Wrap)](#2-how-openclaw-works-the-thing-we-wrap)
3. [What MyClaw Does Differently (The Pattern We Follow)](#3-what-myclaw-does-differently-the-pattern-we-follow)
4. [Our App Architecture](#4-our-app-architecture)
5. [Layer Breakdown](#5-layer-breakdown)
   - [5.1 Frontend (React)](#51-frontend-react)
   - [5.2 Backend (Django)](#52-backend-django)
   - [5.3 OpenClaw Runtime Layer](#53-openclaw-runtime-layer)
   - [5.4 Database Layer](#54-database-layer)
6. [Data Flow: Request Lifecycle](#6-data-flow-request-lifecycle)
7. [Key Django Models](#7-key-django-models)
8. [Key API Endpoints](#8-key-api-endpoints)
9. [React App Structure](#9-react-app-structure)
10. [Config Files and Agent Workspace](#10-config-files-and-agent-workspace)
11. [Deployment Overview](#11-deployment-overview)
12. [What We Are NOT Building (Scope Guard)](#12-what-we-are-not-building-scope-guard)

---

## 1. What We Are Building

We are building a **web-based management layer** on top of a self-hosted OpenClaw instance.

Think of it like this:

```
[ Our App ]  ←—— users interact here (browser)
     |
     ↓
[ OpenClaw ]  ←—— the actual AI agent engine (running locally or on a VPS)
     |
     ↓
[ LLM APIs / Tools / Channels ]  ←—— Claude, GPT, shell, browser, etc.
```

Our app does NOT replace OpenClaw. It wraps it — providing:
- A clean UI to configure and monitor agents
- User authentication and multi-tenant workspaces
- Deployment controls (start/stop/restart OpenClaw processes)
- Observability: logs, usage, errors
- Skill/config management via a web form instead of editing raw files

**Stack:** Django (backend) + React (frontend) + PostgreSQL (database)

---

## 2. How OpenClaw Works (The Thing We Wrap)

Before building the wrapper, understand what OpenClaw is.

OpenClaw has three layers internally:

```
CHANNEL LAYER     — receives messages from WhatsApp, Telegram, Slack, Discord
BRAIN LAYER       — the agent runtime: resolves sessions, assembles context, calls LLM
BODY LAYER        — tool execution: shell, file system, browser automation, MCP servers
```

It runs as a **single Gateway process** (a Node.js/TypeScript server).
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
- `SOUL.md` — agent identity, instructions, personality
- `TOOLS.md` — what tools this agent can use
- `MEMORY.md` — persistent memory store (read/written by the agent)
- `IDENTITY.md` — personalization
- `HEARTBEAT.md` — execution schedule / event loop config

**Our job:** Let users create and edit these files through a web UI,
and manage the OpenClaw process lifecycle.

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
Our app assumes OpenClaw is already running on a known host.

---

## 4. Our App Architecture

High-level diagram:

```
Browser (React SPA)
    |
    | HTTP/WebSocket
    ↓
Django Backend
    ├── REST API          — CRUD for agents, workspaces, users
    ├── WebSocket         — live log streaming from OpenClaw
    ├── Celery Worker     — async tasks (deploy, restart, health checks)
    └── OpenClaw Manager  — talks to OpenClaw process via CLI or local HTTP
            |
            ↓
        OpenClaw Process (running on same host or remote VPS)
            |
            ↓
        LLM APIs + Messaging Channels + Tools
```

---

## 5. Layer Breakdown

### 5.1 Frontend (React)

**What it does:** Provides the entire user interface.

Pages and their purpose:

```
/login              — authentication
/dashboard          — overview: agents, health, recent activity
/agents             — list all agents
/agents/new         — create a new agent (fills SOUL.md, TOOLS.md etc.)
/agents/:id         — view/edit one agent's config
/agents/:id/logs    — live log stream for that agent
/agents/:id/memory  — view/edit MEMORY.md for that agent
/workspaces         — manage workspaces (if multi-tenant)
/settings           — API keys, model selection, billing
```

Key React patterns to use:
- `react-query` or SWR for data fetching and cache
- WebSocket hook for live log tailing
- Controlled forms for agent config (SOUL.md rendered as a textarea, TOOLS.md as checkboxes)
- Context for auth state

### 5.2 Backend (Django)

**What it does:** Serves the API, manages the database, controls the OpenClaw process.

App structure inside Django project:

```
myapp/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── celery.py
└── apps/
    ├── accounts/        — User, Workspace models; auth endpoints
    ├── agents/          — Agent model, config management, CRUD API
    ├── runtime/         — OpenClaw process manager (start/stop/restart)
    ├── logs/            — Log ingestion, storage, WebSocket streaming
    └── skills/          — Skill registry (list/enable/disable skills per agent)
```

Django REST Framework (DRF) handles all API endpoints.
Django Channels handles WebSocket connections for live logs.
Celery handles background tasks (healthchecks, async deploys).

### 5.3 OpenClaw Runtime Layer

**What it does:** Manages the actual OpenClaw process.

This is a thin Python service inside the `runtime` Django app.
It does three things:

1. **Process Management** — start/stop/restart OpenClaw via subprocess
2. **Config Sync** — writes agent config files (SOUL.md etc.) to disk before starting
3. **Health Check** — polls OpenClaw's local HTTP endpoint to confirm it is alive

```python
# Rough idea — lives in apps/runtime/manager.py

class OpenClawManager:
    def start(self, agent_id): ...    # writes configs, runs: pnpm start
    def stop(self, agent_id): ...     # kills the process
    def restart(self, agent_id): ...  # stop + start
    def status(self, agent_id): ...   # returns: running | stopped | error
    def tail_logs(self, agent_id): ...# yields log lines for WebSocket
```

OpenClaw binds to `127.0.0.1:18789` by default.
We can also call its local API directly for session info.

### 5.4 Database Layer

**What it stores:** Everything about users, agents, workspaces, and logs.

Uses PostgreSQL. Key tables explained in Section 7.

---

## 6. Data Flow: Request Lifecycle

### Creating and Deploying an Agent

```
1. User fills the "New Agent" form in React
2. React POSTs to: POST /api/agents/
3. Django creates an Agent record in the database
4. Django writes config files to disk:
       /workspaces/{workspace_id}/agents/{agent_id}/SOUL.md
       /workspaces/{workspace_id}/agents/{agent_id}/TOOLS.md
       ... etc.
5. Celery task queued: deploy_agent(agent_id)
6. Celery worker calls OpenClawManager.start(agent_id)
7. OpenClaw process starts, connects to configured channels
8. Django updates Agent.status = "running"
9. React polls GET /api/agents/:id and shows "Running" badge
```

### Viewing Live Logs

```
1. User opens /agents/:id/logs in browser
2. React opens a WebSocket to: ws://ourapp.com/ws/logs/{agent_id}/
3. Django Channels consumer subscribes to that agent's log stream
4. Celery worker (or log reader) tails the OpenClaw log file
5. New log lines are pushed via Django Channels to the WebSocket
6. React appends lines to the log viewer in real time
```

---

## 7. Key Django Models

```python
# apps/accounts/models.py

class Workspace(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    # disk path: /workspaces/{id}/


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    workspace = models.ForeignKey(Workspace, on_delete=models.SET_NULL, null=True)
```

```python
# apps/agents/models.py

class Agent(models.Model):
    STATUS_CHOICES = [
        ("stopped", "Stopped"),
        ("running", "Running"),
        ("error", "Error"),
        ("deploying", "Deploying"),
    ]

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="stopped")
    model_provider = models.CharField(max_length=50)  # "claude", "openai", "ollama"
    model_name = models.CharField(max_length=100)     # "claude-sonnet-4-20250514"
    soul_md = models.TextField(blank=True)            # contents of SOUL.md
    tools_md = models.TextField(blank=True)           # contents of TOOLS.md
    memory_md = models.TextField(blank=True)          # contents of MEMORY.md
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class AgentChannel(models.Model):
    # Which messaging channels this agent listens on
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name="channels")
    channel_type = models.CharField(max_length=50)  # "telegram", "slack", "discord"
    config = models.JSONField(default=dict)          # bot token, channel ID, etc.
    enabled = models.BooleanField(default=True)
```

```python
# apps/logs/models.py

class AgentLog(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name="logs")
    level = models.CharField(max_length=10)   # "info", "error", "debug"
    message = models.TextField()
    timestamp = models.DateTimeField()

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["agent", "timestamp"])]
```

```python
# apps/skills/models.py

class Skill(models.Model):
    # Skills are reusable capability modules (like OpenClaw's skill registry)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    soul_md_snippet = models.TextField()   # injected into agent's SOUL.md
    is_builtin = models.BooleanField(default=True)


class AgentSkill(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    enabled = models.BooleanField(default=True)
```

---

## 8. Key API Endpoints

All endpoints are under `/api/` and use DRF. Auth via JWT (djangorestframework-simplejwt).

```
AUTH
POST   /api/auth/login/             — returns JWT tokens
POST   /api/auth/refresh/           — refresh access token
POST   /api/auth/register/          — create account

AGENTS
GET    /api/agents/                 — list all agents for current workspace
POST   /api/agents/                 — create new agent
GET    /api/agents/:id/             — get one agent (includes config fields)
PATCH  /api/agents/:id/             — update agent config
DELETE /api/agents/:id/             — delete agent

AGENT ACTIONS (these trigger Celery tasks)
POST   /api/agents/:id/start/       — deploy and start the agent
POST   /api/agents/:id/stop/        — stop the agent
POST   /api/agents/:id/restart/     — restart the agent
GET    /api/agents/:id/status/      — current running status

LOGS
GET    /api/agents/:id/logs/        — paginated log history
WS     /ws/logs/:id/               — WebSocket: live log stream

SKILLS
GET    /api/skills/                 — list available skills
GET    /api/agents/:id/skills/      — skills enabled for this agent
POST   /api/agents/:id/skills/      — enable a skill
DELETE /api/agents/:id/skills/:sid/ — disable a skill

MEMORY
GET    /api/agents/:id/memory/      — get current MEMORY.md content
PUT    /api/agents/:id/memory/      — overwrite MEMORY.md content

CHANNELS
GET    /api/agents/:id/channels/    — list connected channels
POST   /api/agents/:id/channels/    — add a channel (Telegram, Slack, etc.)
DELETE /api/agents/:id/channels/:cid/ — remove a channel
```

---

## 9. React App Structure

```
frontend/
├── src/
│   ├── main.jsx              — app entry point
│   ├── App.jsx               — router setup
│   ├── api/
│   │   ├── client.js         — axios instance with JWT header injection
│   │   ├── agents.js         — agent CRUD calls
│   │   ├── auth.js           — login/register calls
│   │   └── logs.js           — log fetch + WebSocket hook
│   ├── hooks/
│   │   ├── useAuth.js        — auth state from context
│   │   ├── useAgents.js      — react-query wrapper for agent list
│   │   └── useLiveLogs.js    — WebSocket hook for log streaming
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AgentList.jsx
│   │   ├── AgentDetail.jsx   — view + edit agent config
│   │   ├── AgentLogs.jsx     — live log viewer
│   │   ├── AgentMemory.jsx   — read/write MEMORY.md
│   │   └── Settings.jsx
│   ├── components/
│   │   ├── AgentCard.jsx     — shows name, status badge, quick actions
│   │   ├── StatusBadge.jsx   — "Running" / "Stopped" / "Error" pill
│   │   ├── LogViewer.jsx     — scrollable log terminal UI
│   │   ├── ConfigForm.jsx    — generic form for SOUL.md, TOOLS.md etc.
│   │   └── ChannelConfig.jsx — form to connect Telegram/Slack/etc.
│   └── contexts/
│       └── AuthContext.jsx   — stores JWT, user info, workspace
```

---

## 10. Config Files and Agent Workspace

Each agent gets its own directory on the server:

```
/workspaces/
└── {workspace_id}/
    └── agents/
        └── {agent_id}/
            ├── SOUL.md        ← agent identity and instructions
            ├── TOOLS.md       ← which tools are enabled
            ├── MEMORY.md      ← persistent memory (read/written by OpenClaw)
            ├── IDENTITY.md    ← personalization (name, avatar text)
            ├── HEARTBEAT.md   ← scheduled tasks / event loop
            └── openclaw.log   ← log file tailed for live log streaming
```

**Important rule:** The database (`soul_md`, `tools_md` fields in Agent model)
is the **source of truth** for config. When an agent starts, Django writes
these fields out to disk. Never edit the files directly — always go through the API.

The exception is `MEMORY.md` — OpenClaw writes to this during runtime.
Our app reads it back from disk when the user views the Memory page.

---

## 11. Deployment Overview

For the initial version, everything runs on a single VPS:

```
VPS
├── Nginx                    — reverse proxy, serves React build, proxies /api/ and /ws/
├── Django (Gunicorn)        — our backend
├── Django Channels (Daphne) — WebSocket server
├── Celery Worker            — background tasks
├── Redis                    — Celery broker + Django Channels layer
├── PostgreSQL               — primary database
└── OpenClaw process(es)     — the AI agent runtime (managed by our app)
```

Docker Compose is the recommended local dev setup.
Each of the above gets its own service in `docker-compose.yml`.

For production: a single `docker-compose.prod.yml` with proper environment variables.

---

## 12. What We Are NOT Building (Scope Guard)

This section exists to keep scope under control. Do NOT implement these in v1:

- **VPS provisioning** — MyClaw does this; we assume OpenClaw is already installed
- **Billing / subscription management** — out of scope for now
- **Multi-region or distributed OpenClaw** — one host per workspace is enough
- **Custom LLM provider adapters** — just pass the API key through to OpenClaw's config
- **Mobile app** — responsive web is sufficient
- **Fine-tuning or model training** — not relevant here

When in doubt: if it is not in the endpoint list in Section 8, it is not in scope.

---

*End of design.md — last updated April 2026*