import { Injectable, Logger } from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';

/**
 * RuntimeService manages agent lifecycle.
 *
 * In the current architecture, agents are not separate processes — LLM calls
 * happen inline in ChatService. Start/stop simply toggle agent status so the
 * UI can reflect whether an agent is "active" or "paused".
 */
@Injectable()
export class RuntimeService {
  private readonly logger = new Logger(RuntimeService.name);

  constructor(private readonly agentsService: AgentsService) {}

  async start(agentId: string, workspaceId: string): Promise<void> {
    await this.agentsService.assertOwnership(agentId, workspaceId);
    await this.agentsService.updateStatus(agentId, 'running', null);
    this.logger.log(`Agent ${agentId} started`);
  }

  async stop(agentId: string, workspaceId: string): Promise<void> {
    try {
      await this.agentsService.assertOwnership(agentId, workspaceId);
    } catch {
      return;
    }
    await this.agentsService.updateStatus(agentId, 'stopped', null);
    this.logger.log(`Agent ${agentId} stopped`);
  }

  async restart(agentId: string, workspaceId: string): Promise<void> {
    await this.stop(agentId, workspaceId);
    await this.start(agentId, workspaceId);
  }
}
