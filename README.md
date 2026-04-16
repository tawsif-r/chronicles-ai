# ChroniclesAI

Web platform for creating, deploying, and chatting with AI agents. Build custom agents without code, integrate with Telegram/Slack, and manage everything from one dashboard.

## Features

- **Agent Builder** — Create AI agents with custom system prompts and behaviors
- **Live Chat** — Chat with agents directly in the browser, view real-time execution logs
- **Channel Integration** — Connect agents to Telegram, Slack, and other platforms
- **API Keys** — Securely manage credentials for agent integrations
- **Self-Hosted Runtime** — Powered by [OpenClaw](https://github.com/openinterpreter/openinterpreter), a self-hosted AI agent runtime
- **Dashboard** — Monitor agent status, logs, and performance

## Tech Stack

- **Backend:** NestJS + TypeScript, PostgreSQL, Redis, Bull queues
- **Frontend:** React + TypeScript, Tailwind CSS
- **Runtime:** OpenClaw (child processes on dynamic ports)
- **Deployment:** Docker, monorepo with pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm
- Docker + Docker Compose

### Setup

1. Clone and install:
   ```bash
   git clone <repo>
   cd chroniclesAi
   pnpm install
   ```

2. Configure env:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in JWT secrets (see `design.md` for details).

3. Start services:
   ```bash
   docker compose up postgres redis -d
   ```

4. Run backend + frontend:
   ```bash
   pnpm dev:backend  # http://localhost:3000/api
   pnpm dev:frontend # http://localhost:5173
   ```

5. Register an account at `http://localhost:5173/register`

See `design.md` for full setup, architecture, and module overview.

## Project Status

- ✅ Backend modules (Auth, Users, Agents, Chat, Logs, API Keys)
- ✅ Frontend pages (Login, Dashboard, Chat, Logs, Memory)
- ✅ Styling (Tailwind v4, dark minimal design)
- 🔄 OpenClaw gateway integration in progress

## License

MIT
