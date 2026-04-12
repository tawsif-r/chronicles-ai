## so how will the app that i am building with openclaw separate the space for different users??

Great question. Based on your design doc, here's how multi-tenancy works in your app:

**The Workspace is the isolation unit.** Every user belongs to a Workspace, and every agent belongs to a Workspace. So user A's agents are simply never returned when user B queries `/api/agents` — the service layer filters by `workspaceId` from the JWT.

**On disk**, isolation is physical:

```
/workspaces/
  {workspaceId-A}/agents/{agentId}/SOUL.md ...
  {workspaceId-B}/agents/{agentId}/SOUL.md ...
```

Each OpenClaw child process is spawned with `cwd` pointing to its specific agent directory, so processes can't accidentally read each other's config files.

**In the database**, every entity traces back to a Workspace via foreign key:

```
User → Workspace
Agent → Workspace
AgentChannel → Agent → Workspace
AgentLog → Agent → Workspace
```

So any query that doesn't join through the correct workspace will return nothing for that user.

**A few gaps your design doc doesn't explicitly address** that you'll want to think through:

- **One user, one workspace (for now)?** Your `User` entity has a single `ManyToOne` to Workspace, so a user can only belong to one workspace. That's fine for v1, but worth being intentional about.
- **Workspace membership guard** — your JWT guard protects routes, but you also need a service-level check that the agent being accessed actually belongs to the requesting user's workspace. Otherwise user A could hit `GET /api/agents/{agentB-id}` and get data back. This is the classic IDOR (Insecure Direct Object Reference) vulnerability and is easy to miss.
- **Process isolation** — OpenClaw processes are just child processes on the same host, sharing the same OS user and CPU/memory. There's no hard resource isolation between workspaces in v1, which is fine as long as you're aware of it.

The short answer: Workspace ID is the tenancy boundary, enforced in the service layer and on disk.