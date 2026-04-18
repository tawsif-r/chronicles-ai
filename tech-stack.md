# tech-stack.md — ChroniclesAI

> Technology choices and rationale. Reference this when making dependency decisions.

---

## Core Stack

| Layer        | Technology              | Version (target) | Notes                                      |
|--------------|-------------------------|------------------|--------------------------------------------|
| Frontend     | React                   | 18+              | SPA, deployed as static build              |
| Backend      | NestJS (Node.js)        | 10+              | TypeScript, same ecosystem as OpenClaw     |
| ORM          | TypeORM                 | 0.3+             | TypeScript-native, works well with NestJS  |
| Database     | PostgreSQL               | 16               | Primary persistent store                   |
| Cache / Queue| Redis                   | 7                | Bull queue broker                          |
| Queue        | Bull (BullMQ)           | —                | Background jobs: deploy, restart           |
| Auth         | JWT (Passport + NestJS) | —                | Stateless auth via access + refresh tokens |
| WebSocket    | Socket.io               | —                | Live log streaming                         |
| LLM SDKs     | @anthropic-ai/sdk, openai | —             | Direct LLM API calls (inline, no gateway)   |

---

## Developer Stack Expertise

The developer is proficient in:

- **TypeScript / Node.js** — primary language, no hand-holding needed
- **NestJS** — familiar with modules, decorators, guards, interceptors, pipes
- **React** — component patterns, hooks, context
- **Python / Django** — available if a microservice ever needs it (not planned for v1)
- **Redis** — understands pub/sub, cache, and as a queue broker
- **RabbitMQ** — available if Bull+Redis proves insufficient for multi-worker pub/sub

---

## Dependency Decisions

### Why Bull (not RabbitMQ) for v1?
- Bull runs within the NestJS process, zero extra infrastructure beyond Redis
- RabbitMQ adds operational overhead (separate broker, separate worker processes, AMQP protocol)
- Bull is sufficient for deploy jobs and health checks
- **Switch to RabbitMQ only if:** we need multiple worker processes consuming from the same queue, or need advanced routing/exchange patterns

### Why Socket.io (not raw WebSocket)?
- Auto-reconnect and room management built in
- NestJS `@nestjs/websockets` has first-class Socket.io adapter
- Log streaming fits the room-per-agent pattern naturally

### Why TypeORM (not Prisma)?
- TypeScript decorators match NestJS patterns (class-based entities)
- Familiarity with the TypeScript ecosystem
- Prisma is a valid alternative if migrations become painful

### Why Node.js + NestJS for backend?
- Full TypeScript means shared types between backend and frontend with zero drift
- NestJS ecosystem provides auth, WebSocket, validation, ORM out of the box
- LLM SDKs (@anthropic-ai/sdk, openai) are JavaScript-native and first-class
- Easier to integrate channel SDKs (Slack, Telegram, Discord, Twilio) in a single process

---

## Monorepo vs. Separate Repos

**Decision: Monorepo with pnpm workspaces**

```
/
├── backend/     NestJS app
├── frontend/    React app
└── shared/      shared TypeScript types (imported by both)
```

Benefits:
- Shared types are imported directly, no npm publish needed
- Single `pnpm install` for all packages
- Easier to keep versions in sync

---

## Environment Variables

```
# backend/.env
DATABASE_URL=postgres://user:pass@localhost:5432/chroniclesai
REDIS_URL=redis://localhost:6379
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
API_KEY_ENCRYPTION_SECRET=<32 char AES key>
NODE_ENV=development
```
