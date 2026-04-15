import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChildProcess, spawn } from 'child_process';
import { AgentsService } from '../agents/agents.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { LogsService } from '../logs/logs.service';
import * as path from 'path';

@Injectable()
export class RuntimeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RuntimeService.name);
  private readonly processes = new Map<string, ChildProcess>();
  private readonly usedPorts = new Set<number>();

  private readonly portStart: number;
  private readonly portEnd: number;
  private readonly binary: string;

  constructor(
    private readonly agentsService: AgentsService,
    private readonly workspacesService: WorkspacesService,
    private readonly apiKeysService: ApiKeysService,
    private readonly logsService: LogsService,
    private readonly cfg: ConfigService,
  ) {
    this.portStart = parseInt(cfg.get('OPENCLAW_PORT_RANGE_START', '18800'));
    this.portEnd = parseInt(cfg.get('OPENCLAW_PORT_RANGE_END', '19800'));
    this.binary = cfg.get('OPENCLAW_BINARY', 'openclaw');
  }

  /** On restart: mark all previously-running agents as 'error' (ADR-001 option a). */
  async onApplicationBootstrap() {
    // TODO: query DB for status='running' agents and set them to 'error'
    this.logger.log('RuntimeService ready');
  }

  async start(agentId: string, workspaceId: string): Promise<void> {
    const agent = await this.agentsService.assertOwnership(agentId, workspaceId);

    if (agent.status === 'running') {
      throw new BadRequestException('Agent is already running');
    }

    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) throw new BadRequestException('Workspace not found');

    await this.agentsService.writeConfigFiles(agent, workspace);

    const port = this.acquirePort();
    await this.agentsService.updateStatus(agentId, 'starting', port);

    const agentDir = path.join(workspace.diskPath, 'agents', agentId);
    const apiKeyEnv = await this.apiKeysService.buildEnvForAgent(workspaceId);

    const proc = spawn(this.binary, ['start', '--port', String(port)], {
      cwd: agentDir,
      env: { ...process.env, ...apiKeyEnv },
    });

    this.processes.set(agentId, proc);

    proc.stdout?.on('data', (chunk: Buffer) => {
      this.logsService.ingest(agentId, 'info', chunk.toString());
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      this.logsService.ingest(agentId, 'error', chunk.toString());
    });

    proc.on('spawn', () => {
      this.agentsService.updateStatus(agentId, 'running', port);
      this.logger.log(`Agent ${agentId} started on port ${port}`);
    });

    proc.on('close', (code) => {
      this.usedPorts.delete(port);
      this.processes.delete(agentId);
      this.agentsService.updateStatus(agentId, code === 0 ? 'stopped' : 'error', null);
      this.logger.log(`Agent ${agentId} exited with code ${code}`);
    });
  }

  async stop(agentId: string, workspaceId: string): Promise<void> {
    // Ownership check (no-op if agent doesn't exist during delete)
    try {
      await this.agentsService.assertOwnership(agentId, workspaceId);
    } catch {
      return;
    }

    const proc = this.processes.get(agentId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(agentId);
    }

    await this.agentsService.updateStatus(agentId, 'stopped', null);
  }

  async restart(agentId: string, workspaceId: string): Promise<void> {
    await this.stop(agentId, workspaceId);
    await this.start(agentId, workspaceId);
  }

  getProcess(agentId: string): ChildProcess | undefined {
    return this.processes.get(agentId);
  }

  private acquirePort(): number {
    for (let p = this.portStart; p <= this.portEnd; p++) {
      if (!this.usedPorts.has(p)) {
        this.usedPorts.add(p);
        return p;
      }
    }
    throw new Error('No free ports available in the pool');
  }
}
